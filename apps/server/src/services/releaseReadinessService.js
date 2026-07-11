import { config, productionConfigIssues } from "../config.js";
import { mongoStatus } from "../db/mongo.js";
import { emailDeliveryReadiness } from "./emailService.js";
import { platformAdminConfigured } from "./platformAccessService.js";

export function releaseReadiness() {
  const database = mongoStatus();
  const email = emailDeliveryReadiness();
  const configurationIssues = productionConfigIssues(process.env);
  const adminAllowlistConfigured = platformAdminConfigured();
  return {
    environment: config.environment,
    readyForProduction: Boolean(database.connected && email.automaticDelivery && configurationIssues.length === 0),
    checks: {
      database: {
        ready: database.connected,
        configured: database.configured,
        driver: database.driver,
        database: database.database
      },
      email,
      billing: {
        mode: config.billingMode,
        enabled: config.billingMode !== "disabled",
        simulated: false
      },
      platformAdmin: {
        allowlistConfigured: adminAllowlistConfigured,
        storedRolesSupported: true
      },
      productionConfiguration: {
        valid: configurationIssues.length === 0,
        issues: configurationIssues
      }
    }
  };
}
