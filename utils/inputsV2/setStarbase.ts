import inquirer from "inquirer";
import { SageFleet } from "../../src/SageFleet";
import { SectorCoordinates } from "../../common/types";
import { Starbase } from "@staratlas/sage";
import { byteArrayToString } from "@staratlas/data-source";
import { starbasesInfo } from "../../common/constants";

export const setStarbaseV2 = async (
  fleet: SageFleet,
  excludeFleetCurrentStarbase: boolean = false,
) => {
  const indexMap = new Map(starbasesInfo.map((item, index) => [item.name, index]));
  const starbases = fleet.getSageGame().getStarbases().map((starbase) => {
    const prettyName = fleet.getSageGame().getStarbasePrettyName(starbase);
    return {
      prettyName,
      data: starbase,
    }
  }).sort((a, b) => {
    const indexA = indexMap.get(a.prettyName) || indexMap.size;
    const indexB = indexMap.get(b.prettyName) || indexMap.size;

    return indexA - indexB;
  });

  const fleetCurrentSector = await fleet.getCurrentSector();
  
  const { starbase } = await inquirer.prompt<{ starbase: Starbase }>([
    {
      type: "list",
      name: "starbase",
      message: "Choose the starbase destination:",
      choices: !excludeFleetCurrentStarbase
        ? starbases.map((starbase) => ({
            name: fleet.getSageGame().bnArraysEqual(starbase.data.data.sector, fleetCurrentSector.data.coordinates) ? 
              `${starbase.prettyName} - ${byteArrayToString(starbase.data.data.name)} (current starbase)` : 
              `${starbase.prettyName} - ${byteArrayToString(starbase.data.data.name)}`,
            value: starbase.data,
          }))
        : starbases.filter((starbase) => !fleet.getSageGame().bnArraysEqual(starbase.data.data.sector, fleetCurrentSector.data.coordinates)).map((starbase) => ({
          name: `${starbase.prettyName} - ${byteArrayToString(starbase.data.data.name)}`,
          value: starbase.data,
        }))
    },
  ]);

  return { type: "Success" as const, data: starbase };
};
