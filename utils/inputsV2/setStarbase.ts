import { byteArrayToString } from "@staratlas/data-source";
import { Starbase } from "@staratlas/sage";
import inquirer from "inquirer";
import { starbasesInfo } from "../../common/constants";
import { SageFleet } from "../../src/SageFleet";

export const setStarbaseV2 = async (
  fleet: SageFleet,
  excludeFleetCurrentStarbase: boolean = false,
  text: string
) => {
  const indexMap = new Map(
    starbasesInfo.map((item, index) => [item.name, index])
  );
  const starbases = fleet
    .getSageGame()
    .getStarbases()
    .map((starbase) => {
      const prettyName = fleet.getSageGame().getStarbasePrettyName(starbase);
      return {
        prettyName,
        data: starbase,
      };
    })
    .sort((a, b) => {
      const indexA = indexMap.get(a.prettyName) || indexMap.size;
      const indexB = indexMap.get(b.prettyName) || indexMap.size;

      return indexA - indexB;
    });

  const fleetCurrentSector = fleet.getCurrentSector();

  if (!fleetCurrentSector) {
    return { type: "FleetCurrentSectorError" as const };
  }

  const maybeTargetSector = process.env.TARGET_STARBASE_SECTOR;

  const targetSector = maybeTargetSector ? JSON.parse(maybeTargetSector) : null;

  const maybeTargetStarbase = starbases.find((starbase) => {
    const [x, y] = starbase.data.data.sector;
    const [targetX, targetY] = targetSector;

    return Number(x) === Number(targetX) && Number(y) === Number(targetY);
  });

  const { starbase } = maybeTargetStarbase
    ? {
        starbase: maybeTargetStarbase.data,
      }
    : await inquirer.prompt<{ starbase: Starbase }>([
        {
          type: "list",
          name: "starbase",
          message: text,
          choices: !excludeFleetCurrentStarbase
            ? starbases.map((starbase) => ({
                name: fleet
                  .getSageGame()
                  .bnArraysEqual(
                    starbase.data.data.sector,
                    fleetCurrentSector.coordinates
                  )
                  ? `${starbase.prettyName} - ${byteArrayToString(
                      starbase.data.data.name
                    )} (current starbase)`
                  : `${starbase.prettyName} - ${byteArrayToString(
                      starbase.data.data.name
                    )}`,
                value: starbase.data,
              }))
            : starbases
                .filter(
                  (starbase) =>
                    !fleet
                      .getSageGame()
                      .bnArraysEqual(
                        starbase.data.data.sector,
                        fleetCurrentSector.coordinates
                      )
                )
                .map((starbase) => ({
                  name: `${starbase.prettyName} - ${byteArrayToString(
                    starbase.data.data.name
                  )}`,
                  value: starbase.data,
                })),
        },
      ]);

  return { type: "Success" as const, data: starbase };
};
