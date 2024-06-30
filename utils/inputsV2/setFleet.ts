import { byteArrayToString } from "@staratlas/data-source";
import { Fleet } from "@staratlas/sage";
import inquirer from "inquirer";
import { SageFleet } from "../../src/SageFleet";
import { SagePlayer } from "../../src/SagePlayer";

export const setFleetV2 = async (
  player: SagePlayer,
  showAllFleets: boolean = false
) => {
  const fleets = await player.getAllFleetsAsync();
  if (fleets.type !== "Success") return fleets;

  const selectableFleets = fleets.data.filter((fleet) => {
    return !showAllFleets
      ? fleet.state.StarbaseLoadingBay || fleet.state.Idle
      : true;
  });

  if (selectableFleets.length === 0)
    return { type: "NoFleetsDockedOrUndocked" as const };

  const maybeFleet = process.env.FLEET_NAME
    ? selectableFleets.find(
        (fleet) =>
          process.env.FLEET_NAME === byteArrayToString(fleet.data.fleetLabel)
      )
    : null;

  const { selectedFleet } = maybeFleet
    ? { selectedFleet: maybeFleet }
    : await inquirer.prompt<{ selectedFleet: Fleet }>({
        type: "list",
        name: "selectedFleet",
        message: "Choose a fleet:",
        choices: selectableFleets.map((fleet) => {
          return {
            name: `${byteArrayToString(fleet.data.fleetLabel)} ${
              fleet.state.StarbaseLoadingBay
                ? "(Docked)"
                : fleet.state.Idle ||
                  fleet.state.MoveSubwarp ||
                  fleet.state.MoveWarp
                ? "(Undocked)"
                : fleet.state.MineAsteroid
                ? "(Mining)"
                : ""
            }`,
            value: fleet,
          };
        }),
      });

  // Play with fleets (SageFleet.ts)
  const fleet = await SageFleet.init(selectedFleet, player);

  console.log(
    `Great. You have selected the fleet "${fleet.getName()}" located in (${fleet
      .getCurrentSector()
      ?.coordinates[0].toNumber()},${fleet
      .getCurrentSector()
      ?.coordinates[1].toNumber()})`
  );

  return { type: "Success" as const, data: fleet };
};
