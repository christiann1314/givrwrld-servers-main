import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@18.5.0'
import { corsHeaders } from '../_shared/cors.ts'
import {
  getMySQLPool,
  decryptSecret,
  getPlan,
  createOrder,
  updateOrderStatus,
} from '../_shared/mysql-client.ts'
import { v4 as uuidv4 } from 'https://esm.sh/uuid@9.0.0'

// Note: Using shared CORS headers from _shared/cors.ts

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get AES key for decrypting secrets from MySQL
    const aesKey = Deno.env.get('AES_KEY')
    if (!aesKey) {
      throw new Error('AES_KEY environment variable not set')
    }

    // Decrypt Stripe secrets from MySQL
    const stripeSecretKey = await decryptSecret('stripe', 'STRIPE_SECRET_KEY', aesKey)
    const stripeWebhookSecret = await decryptSecret('stripe', 'STRIPE_WEBHOOK_SECRET', aesKey)

    if (!stripeSecretKey || !stripeWebhookSecret) {
      throw new Error('Stripe secrets not found in MySQL database')
    }

    // Initialize Stripe with decrypted secret
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-08-27.basil',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        console.log('Checkout session completed:', {
          mode: session.mode,
          subscription: session.subscription,
          session_id: session.id,
          metadata: session.metadata
        })
        
        // Validate required metadata
        if (!session.metadata || !session.metadata.user_id) {
          const errorMsg = 'Missing required metadata in checkout session'
          console.error(errorMsg, { session_id: session.id, metadata: session.metadata })
          return new Response(
        JSON.stringify({ error: errorMsg, received: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        if (session.mode === 'subscription' && session.subscription) {
          try {
            // Get subscription details
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
            
            console.log('Processing subscription order:', {
              subscription_id: subscription.id,
              user_id: session.metadata.user_id,
              item_type: session.metadata.item_type,
              server_name: session.metadata.server_name
            })
            
            // Create order record
            const { data: order, error: orderError } = await supabase
              .from('orders')
              .insert({
                user_id: session.metadata.user_id,
                item_type: session.metadata.item_type,
                plan_id: session.metadata.plan_id,
                term: session.metadata.term,
                region: session.metadata.region,
                server_name: session.metadata.server_name,
                addons: JSON.parse(session.metadata.addons || '[]'),
                stripe_sub_id: subscription.id,
                status: 'paid'
              })
              .select()
              .single()

            if (orderError) {
              console.error('Error creating order:', orderError)
              throw orderError
            }

            console.log('Order created successfully:', { order_id: order.id })

            // Send alert
            const alertsWebhook = Deno.env.get('ALERTS_WEBHOOK')
            if (alertsWebhook) {
              try {
                await fetch(alertsWebhook, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    content: `✅ New order: ${session.metadata.item_type} ${session.metadata.plan_id} for ${session.metadata.server_name} in ${session.metadata.region} (Order ID: ${orderId})`
                  })
                })
              } catch (alertError) {
                console.error('Failed to send alert:', alertError)
              }
            }

            // Trigger server provisioning for game servers
            if (session.metadata.item_type === 'game') {
              console.log('Triggering server provisioning for order:', order.id)
              
              // Construct functions URL: https://PROJECT_REF.supabase.co -> https://PROJECT_REF.functions.supabase.co
              const supabaseUrl = Deno.env.get('SUPABASE_URL')!
              const functionsUrl = supabaseUrl.replace('.supabase.co', '.functions.supabase.co')
              console.log('Calling provisioning function at:', `${functionsUrl}/servers-provision`)
              
              try {
                const provisionResponse = await fetch(`${functionsUrl}/servers-provision`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    order_id: order.id
                  })
                })
                
                if (!provisionResponse.ok) {
                  const errorText = await provisionResponse.text()
                  const errorMessage = `Provisioning failed: ${provisionResponse.status} - ${errorText}`
                  console.error(errorMessage)
                  
                  // Store provisioning error in order for debugging
                  await supabase
                    .from('orders')
                    .update({ 
                      status: 'error',
                      // Store error in a JSONB field if you have one, or log it
                    })
                    .eq('id', order.id)
                  
                  // Send alert about provisioning failure
                  const alertsWebhook = Deno.env.get('ALERTS_WEBHOOK')
                  if (alertsWebhook) {
                    try {
                      await fetch(alertsWebhook, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          content: `⚠️ Provisioning failed for order ${order.id}: ${errorMessage}`
                        })
                      })
                    } catch (alertError) {
                      console.error('Failed to send alert:', alertError)
                    }
                  }
                  
                  // Don't throw - we still want to return 200 to Stripe
                  // The order is created, provisioning can be retried manually
                  console.warn('Provisioning failed but order created. Manual retry required.')
                } else {
                  const provisionResult = await provisionResponse.json()
                  console.log('Server provisioning triggered successfully:', provisionResult)
                  
                  // Verify provisioning succeeded by checking if server_id was set
                  // (This happens in servers-provision function, but we can verify here)
                }
              } catch (provisionError) {
                const errorMessage = provisionError instanceof Error ? provisionError.message : 'Unknown provisioning error'
                console.error('Failed to trigger server provisioning:', errorMessage)
                
                // Store error in order
                await supabase
                  .from('orders')
                  .update({ status: 'error' })
                  .eq('id', order.id)
                
                // Send alert
                const alertsWebhook = Deno.env.get('ALERTS_WEBHOOK')
                if (alertsWebhook) {
                  try {
                    await fetch(alertsWebhook, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        content: `⚠️ Failed to trigger provisioning for order ${order.id}: ${errorMessage}`
                      })
                    })
                  } catch (alertError) {
                    console.error('Failed to send alert:', alertError)
                  }
                }
                
                // Don't throw - return 200 to Stripe, but log the error
                console.warn('Provisioning trigger failed but order created. Manual retry required.')
              }
            }
          } catch (processError) {
            console.error('Error processing checkout session:', processError)
            throw processError
          }
        } else {
          const errorMsg = 'Checkout session not in subscription mode or missing subscription'
          const errorDetails = {
            mode: session.mode,
            subscription: session.subscription,
            session_id: session.id
          }
          console.error(errorMsg, errorDetails)
          // Return error instead of silently failing
            return new Response(
            JSON.stringify({ 
              error: errorMsg, 
              details: errorDetails,
              received: false 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        
        // Update order status in MySQL
        const status = event.type === 'customer.subscription.deleted' ? 'canceled' : 'paid'
        const pool = getMySQLPool()
        await pool.execute(
          `UPDATE orders SET status = ? WHERE stripe_sub_id = ?`,
          [status, subscription.id]
        )
        
        console.log(`Updated order status to ${status} for subscription: ${subscription.id}`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        
        if (invoice.subscription) {
          // Mark order as error in MySQL
          const pool = getMySQLPool()
          await pool.execute(
            `UPDATE orders SET status = 'error' WHERE stripe_sub_id = ?`,
            [invoice.subscription as string]
          )
          
          console.log(`Marked order as error for subscription: ${invoice.subscription}`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})