import balance from "../content/design/balance.json";
import { balanceSchema } from "../src/content/balanceSchema";

balanceSchema.parse(balance);
console.log("validate:content — balance.json is valid.");
