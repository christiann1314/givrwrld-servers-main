import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export const TooltipProvider = TooltipPrimitive.Provider;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Content ref={ref} sideOffset={sideOffset} {...props} />
));
TooltipContent.displayName = "TooltipContent";

