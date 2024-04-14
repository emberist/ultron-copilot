import { Profile } from "../../common/constants";
import { getProfileKeypairPath } from "./getProfileKeypairPath";
import { getProfileRpcPath } from "./getProfileRpcPath";
import { setKeypair } from "./setKeypair";
import { setRpc } from "./setRpc";
import { setUsageDisclaimer } from "./setUsageDisclaimer";

export const setupProfileData = async (profile: Profile) => {
  const keypairPath = getProfileKeypairPath(profile);
  const rpcPath = getProfileRpcPath(profile);

  await setUsageDisclaimer(keypairPath);
  await setKeypair(keypairPath);
  await setRpc(rpcPath);
};
