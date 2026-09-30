import { databaseInitializationService } from "../server/database/DatabaseInitializationService";

const result = await databaseInitializationService.initialize();
console.log(JSON.stringify(result, null, 2));
