import React from "react";

export function ServerIntegrationStatus() {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-lg font-semibold">Integrations</h3>
      <p className="text-sm text-muted-foreground mt-2">
        Connected through local MySQL/JWT API. Use "Reset Panel Password" below to generate panel login credentials.
      </p>
    </div>
  );
}

export default ServerIntegrationStatus;
