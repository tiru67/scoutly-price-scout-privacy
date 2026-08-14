chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('scoutly-watch-check', { periodInMinutes: 60 });
});

chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name !== 'scoutly-watch-check') return;
  const { watches = [] } = await chrome.storage.local.get('watches');
  // Price feeds are intentionally not guessed in this MVP. This alarm is the integration point
  // for a verified retailer/API comparison service in the next release.
  await chrome.storage.local.set({ lastWatchCheck: new Date().toISOString(), watchCount: watches.length });
});
