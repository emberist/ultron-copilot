import inquirer from "inquirer";
import { MovementType, movements } from "../../common/constants";

export const setMovementTypeV2 = async () => {
  return inquirer.prompt<{ movement: MovementType }>([
    {
      type: "list",
      name: "movement",
      message: "Choose the fleet movement type:",
      choices: movements,
    },
  ]);
};
