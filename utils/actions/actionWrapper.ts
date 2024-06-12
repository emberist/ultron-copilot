import { NoEnoughTokensToPerformSageAction, SendTransactionsFailed } from "../../common/errors";
import { NotificationMessage } from "../../common/notifications";
import { LabsAction } from "../../common/types";
import { sendNotification } from "./sendNotification";
import { wait } from "./wait";

// If a SAGE action fails, send a notification and retry the same action every minute
export async function actionWrapper<R, A extends any[]>(
  func: LabsAction<R, A>,
  ...args: A
): Promise<R> {
  while (true) {
    try {
      return await func(...args);
    } catch (e) {
      if (e instanceof NoEnoughTokensToPerformSageAction) throw e;
      if (e instanceof SendTransactionsFailed) throw e;
      
      console.error(`\nAction failed. Auto retry in 1 seconds. ${e}`);
      sendNotification(NotificationMessage.FAIL_WARNING);
      await wait(1);
    }
  }
}
