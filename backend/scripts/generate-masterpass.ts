import { randomBytes } from "node:crypto";

/**
 * Generates a secure random MASTERPASS for Drizzle Studio Gateway
 */
const generateMasterpass = () => {
	const password = randomBytes(24).toString("base64url");
	console.log("\n🔑 Generated Drizzle Studio MASTERPASS:");
	console.log("-----------------------------------------");
	console.log(password);
	console.log("-----------------------------------------");
	console.log("\nAdd this to your .env file or docker-compose.yaml environment:");
	console.log(`MASTERPASS=${password}\n`);
};

generateMasterpass();
