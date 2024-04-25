import inquirer from "inquirer";
import { SectorCoordinates } from "../../common/types";
import { BN } from "@staratlas/anchor";
import { SectorRoute } from "../../src/SageFleet";

export const setScanCoordinates = async (fleetCurrentSector: SectorRoute) => {
  const answerX = await inquirer.prompt([
    {
      type: "input",
      name: "coordinate",
      message: "Enter coordinates to start scan. Choose X (Beetwen -50 and 50):",
      default: fleetCurrentSector.coordinates[0].toNumber(),
      validate: (input) => {
        if (parseInt(input) >= -50 && parseInt(input) <= 50) return true;
        return "Please input a valid number.";
      },
    },
  ]);

  const answerY = await inquirer.prompt([
    {
      type: "input",
      name: "coordinate",
      message: "Enter coordinates to start scan. Choose Y (Beetwen -50 and 50):",
      default: fleetCurrentSector.coordinates[1].toNumber(),
      validate: (input) => {
        if (parseInt(input) >= -50 && parseInt(input) <= 50) return true;
        return "Please input a valid number.";
      },
    },
  ]);

  const x = parseInt(answerX.coordinate);
  const y = parseInt(answerY.coordinate);

  return { type: "Success" as const, data: [new BN(x), new BN(y)] as SectorCoordinates }; 
};