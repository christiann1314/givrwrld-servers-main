import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../hooks/useAuth';

interface SubscriptionCardProps {
  planName: string;
  price: string;
  features: string[];
  amount: number;
  isCurrentPlan?: boolean;
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  planName,
  price,
  features,
  amount,
  isCurrentPlan = false
}) => {
  const { user } = useAuth();
  const { subscriptionStatus, createCheckout } = useSubscription(user?.email);

  const handleSubscribe = () => {
    createCheckout(planName, amount);
  };

  return (
    <Card className={`relative ${isCurrentPlan ? 'border-primary shadow-lg' : ''}`}>
      {isCurrentPlan && (
        <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary">
          Current Plan
        </Badge>
      )}
      
      <CardHeader>
        <CardTitle className="text-xl">{planName}</CardTitle>
        <CardDescription>
          <span className="text-3xl font-bold">{price}</span>
          <span className="text-muted-foreground">/month</span>
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center">
              <svg
                className="h-4 w-4 text-primary mr-2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M5 13l4 4L19 7"></path>
              </svg>
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>
      
      <CardFooter>
        {!isCurrentPlan ? (
          <Button
            onClick={handleSubscribe}
            disabled={subscriptionStatus.loading}
            className="w-full"
          >
            {subscriptionStatus.loading ? 'Loading...' : 'Subscribe'}
          </Button>
        ) : (
          <Button variant="outline" className="w-full" disabled>
            Active
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};