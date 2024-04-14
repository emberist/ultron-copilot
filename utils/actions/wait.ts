import * as cliProgress from "cli-progress";

export const wait = (seconds: number): Promise<void> => {
  return new Promise((resolve) => {
    const progressBar = new cliProgress.SingleBar(
      {
        format: "[{bar}]" + " " + "{percentage}%" + " | " + "ETA: {eta}s",
        hideCursor: true,
      },
      cliProgress.Presets.legacy
    );

    progressBar.start(100, 0);

    let elapsed = 0;
    const interval = 1000;
    const timer = setInterval(() => {
      elapsed += interval;
      const progress = (elapsed / (seconds * 1000)) * 100;
      progressBar.update(Math.min(progress, 100));

      if (elapsed >= seconds * 1000) {
        clearInterval(timer);
        progressBar.stop();
        resolve();
      }
    }, interval);
  });
};
