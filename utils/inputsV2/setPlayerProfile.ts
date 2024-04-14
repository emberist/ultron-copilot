import inquirer from "inquirer";
import { PlayerProfile } from "@staratlas/player-profile";

export const setPlayerProfile = async (
  playerProfiles: PlayerProfile[]
) => {
  const { profile } = await inquirer.prompt<{ profile: PlayerProfile }>([
    {
      type: "list",
      name: "profile",
      message: "Choose profile:",
      choices: playerProfiles.map(profile => ({
        name: profile.key.toBase58(),
        value: profile,
      })),
    },
  ]);

  return { type: "Success" as const, data: profile };
};