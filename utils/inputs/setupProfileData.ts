import { Profile } from "../../common/constants";
import { getProfileKeypairPath } from "./getProfileKeypairPath";
import { setKeypair } from "./setKeypair";
import { setRpc } from "./setRpc";
import { setUsageDisclaimer } from "./setUsageDisclaimer";

export const setupProfileData = async (profile: Profile) => {
  const keypairPath = getProfileKeypairPath(profile);

  if (!process.env.SKIP_DISCLAIMER) {
    await setUsageDisclaimer(keypairPath);
  }

  await setKeypair(profile);
  await setRpc(profile);
};
