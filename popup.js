document.addEventListener('DOMContentLoaded', function() {
  const stashButton = document.getElementById('stashButton');
  const openButton = document.getElementById('openButton');
  const statusDiv = document.getElementById('status');
  const dateInput = document.getElementById('eventDate');
  const timeInput = document.getElementById('eventTime');
  const eventNameInput = document.getElementById('eventName');
  const saveDefaultCheck = document.getElementById('saveAsDefault');
  const spinner = document.getElementById('spinner');
  const buttonText = document.getElementById('buttonText');

  // Variable to store the event URL
  let createdEventUrl = '';

  // Set tomorrow's date
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(today.getDate() + 1);
  
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Load defaults and set event name based on page title
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const tab = tabs[0];
    const defaultName = `Review: ${tab.title}`;
    eventNameInput.value = defaultName;

    chrome.storage.sync.get({ defaultTime: '08:00' }, function(items) {
      dateInput.value = tomorrowStr;
      timeInput.value = items.defaultTime;
      stashButton.disabled = false;
    });
  });

  stashButton.addEventListener('click', async () => {
    try {
      statusDiv.style.display = 'none';

      if (!dateInput.value || !timeInput.value || !eventNameInput.value.trim()) {
        throw new Error('Please fill in all fields');
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      const dateTimeStr = `${dateInput.value}T${timeInput.value}:00`;
      const eventDateTime = new Date(dateTimeStr);

      if (isNaN(eventDateTime.getTime())) {
        throw new Error('Please select a valid date and time');
      }

      if (saveDefaultCheck.checked) {
        chrome.storage.sync.set({ defaultTime: timeInput.value });
      }

      // Show loading state
      stashButton.disabled = true;
      spinner.style.display = 'inline-block';
      buttonText.textContent = 'Creating event...';

      const response = await chrome.runtime.sendMessage({
        action: 'stashFile',
        fileUrl: tab.url,
        eventDateTime: eventDateTime.toISOString(),
        eventName: eventNameInput.value
      });

      if (response.success && response.details && response.details.htmlLink) {
        createdEventUrl = response.details.htmlLink;
        openButton.style.display = 'block';

        statusDiv.textContent = 'Calendar event created!';
        statusDiv.className = 'status success';
      } else {
        throw new Error(response.message || 'Failed to create event.');
      }

    } catch (error) {
      statusDiv.textContent = error.message;
      statusDiv.className = 'status error';
      openButton.style.display = 'none';
    } finally {
      statusDiv.style.display = 'block';
      spinner.style.display = 'none';
      buttonText.textContent = 'Stash It';
      stashButton.disabled = false;
    }
  });

  openButton.addEventListener('click', () => {
    if (createdEventUrl) {
      chrome.tabs.create({ url: createdEventUrl });
    }
  });
});
