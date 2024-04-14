import { SageFleet } from "../../src/SageFleet";
import { SagePlayer } from "../../src/SagePlayer";
import inquirer from "inquirer";
import { byteArrayToString } from "@staratlas/data-source";
import { Fleet } from "@staratlas/sage";

export const setFleetV2 = async (player: SagePlayer) => {
    const fleets = await player.getAllFleetsAsync();
    if (fleets.type !== "Success") return fleets;

    const { selectedFleet } = await inquirer.prompt<{ selectedFleet: Fleet }>({
        type: "list",
        name: "selectedFleet",
        message: "Choose a fleet:",
        choices: fleets.data.map((fleet) => {
          return {
            name: byteArrayToString(fleet.data.fleetLabel),
            value: fleet,
          };
        }),
      });
    
    // Play with fleets (SageFleet.ts)
    const fleet = await SageFleet.init(selectedFleet, player);
    return { type: "Success" as const, data: fleet };
}