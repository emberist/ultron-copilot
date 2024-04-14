#!/usr/bin/env node

import { version } from "./package.json";
import { SageGame } from "./src/SageGame";
import { SagePlayer } from "./src/SagePlayer";
import { getConnection } from "./utils/inputs/getConnection";
import { getKeypairFromSecret } from "./utils/inputs/getKeypairFromSecret";
import { inputProfile } from "./utils/inputs/inputProfile";
import { resetProfile } from "./utils/inputs/resetProfile";
import { setStart } from "./utils/inputs/setStart";
import { setupProfileData } from "./utils/inputs/setupProfileData";
import { miningV2 } from "./scripts/miningV2";
import { cargoV2 } from "./scripts/cargoV2";
import { setPriority } from "./utils/inputsV2/setPriority";
import { PriorityLevel } from "./common/constants";
import { setCustomPriority } from "./utils/inputsV2/setCustomPriority";
import { cargoMiningV2 } from "./scripts/cargoMiningV2";
import { scanV2 } from "./scripts/scanV2";
import { setActivityV2 } from "./utils/inputsV2/setActivity";

const test = async () => {
  console.log(`Welcome to Ultron ${version}!`);

  const { startOption } = await setStart();

  if (startOption === "Settings") {
    await resetProfile();
    return;
  }

  // qui l'utente configura il livello di priority fee desiderato e l'eventuale custom priority fee value
  const priorityFees = await setPriority();
  const { customPriority } = priorityFees.priority === PriorityLevel.Custom ? await setCustomPriority() : { customPriority: 0 }

  // qui l'utente sceglie il profilo desiderato
  const { profile } = await inputProfile();

  // qui si controlla se il profilo esiste già, se no, lo si crea
  await setupProfileData(profile);

  // qui si impostano il keypair e la connection
  const keypair = await getKeypairFromSecret(profile);

  const connection = getConnection(profile);

  // FIX: se la connessione non è andata a buon fine, Ultron riprova
  if (connection.type !== "Success") {
    console.log("Connection failed, please retry.")
    return;
  }

  // 1. Setup environment (SageGame.ts) [keypair required]
  const sage = await SageGame.init(keypair, connection.data, { level: priorityFees.priority, value: customPriority });
  // console.log(sage.getGame().data)

  // 2. Setup player (SagePlayer.ts)
  const playerProfiles = await sage.getPlayerProfilesAsync();
  if (playerProfiles.type !== "Success") {
    console.log("Error getting player profiles.")
    return;
  }

  const player = await SagePlayer.init(sage, playerProfiles.data[0]);

  const activity = await setActivityV2();

  /* const userPoints = await player.getUserPointsAsync();
  if (userPoints.type !== "Success") return;
  console.log(userPoints.data) */

  switch (activity) {
    case "Mining":
      // 3. Play with mining
      const mining = await miningV2(player);
      if (mining.type !== "Success") {
        console.log("Mining failed.", mining.type)
        return;
      }
      break;

    case "Cargo":
      // 4. Play with cargo
      const cargo = await cargoV2(player);
      if (cargo.type !== "Success") {
        console.log("Cargo failed.", cargo.type)
        return;
      }
      break;

    case "Combo":
      // 5. Play with cargo mining
      const cargoMining = await cargoMiningV2(player);
      if (cargoMining.type !== "Success") {
        console.log("Cargo mining failed.", cargoMining.type)
        return;
      }
      break;

    case "Scan":
      // 6. Play with scanning
      const scan = await scanV2(player);
      if (scan.type !== "Success") {
        console.log("\nScan failed.", scan.type)
        return;
      }
      break;

    default:
      return;
  }

  // 7. Play with crafting (SageCrafting.ts)
  // ...


  // 8. Play with galactic marketplace (GalacticMarketplace.ts)
  // ...

  /* const data = await sage.getPlanets()
  console.log(data) */

 /*  const data = await sage.getResourcesByPlanet(sage.getPlanets().find(item => item.data.planetType === PlanetType.AsteroidBelt)!)
  if (data.type !== "Success") throw new Error(data.type);
  console.log(sage.getResourceName(data.data[0])); */

}

test().catch((err) => {
  console.error(err);
  process.exit(1);
});