import { verifiedRpc } from "../../common/constants";

export const validateRpcUrl = (rpcUrl: string) => {
  try {
    const url = new URL(rpcUrl);

    let rpcFoundInList:boolean = false
    for (var rpc of verifiedRpc)
    {
      if((url.hostname).indexOf(rpc) > -1) {
        rpcFoundInList = true
      }
    }

    if (rpcFoundInList && url.protocol === "https:") {
      return { type: "Success" as const, result: rpcUrl };
    }

    return { type: "InvalidRpcUrl" as const };
  } catch (e) {
    return { type: "InvalidRpcUrl" as const };
  }
};
