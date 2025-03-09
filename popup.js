document.addEventListener('DOMContentLoaded', function() {
  const stashButton = document.getElementById('stashButton');
  const openButton = document.getElementById('openButton');
  const statusDiv = document.getElementById('status');
  const dateInput = document.getElementById('eventDate');
  const timeInput = document.getElementById('eventTime');
  const eventNameInput = document.getElementById('eventName');
  const saveDefaultCheck = document.getElementById('saveAsDefault');
  
  // Variable to store the event URL
  let createdEventUrl = '';

  // Set tomorrow's date
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setHours(0, 0, 0, 0); // Reset time to midnight
  tomorrow.setDate(today.getDate() + 1); // Add one day
  
  // Format date as YYYY-MM-DD
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  // Load saved defaults and set up page title
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const tab = tabs[0];
    const defaultName = `Review: ${tab.title}`;
    eventNameInput.value = defaultName;

    chrome.storage.sync.get({
      defaultTime: '08:00'
    }, function(items) {
      dateInput.value = tomorrowStr;
      timeInput.value = items.defaultTime;
      
      // Make sure button is enabled after populating values
      stashButton.disabled = false;
    });
  });

  stashButton.addEventListener('click', async () => {
    try {
      // Basic validation before proceeding
      if (!dateInput.value || !timeInput.value || !eventNameInput.value.trim()) {
        throw new Error('Please fill in all fields');
      }
      
      // Get the current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Combine date and time inputs
      const dateTimeStr = `${dateInput.value}T${timeInput.value}:00`;
      const eventDateTime = new Date(dateTimeStr);

      if (isNaN(eventDateTime.getTime())) {
        throw new Error('Please select a valid date and time');
      }

      // Save as default if checked
      if (saveDefaultCheck.checked) {
        chrome.storage.sync.set({
          defaultTime: timeInput.value
        });
      }

      // Show loading state
      stashButton.disabled = true;
      stashButton.textContent = 'Creating event...';
      
      // Send message to background script
      const response = await chrome.runtime.sendMessage({
        action: 'stashFile',
        fileUrl: tab.url,
        eventDateTime: eventDateTime.toISOString(),
        eventName: eventNameInput.value
      });

      // Show success message
      statusDiv.textContent = 'Calendar event created!';
      statusDiv.className = 'status success';
      statusDiv.style.display = 'block';
      
      // Store the event URL and show the Open button
      if (response.success && response.details && response.details.htmlLink) {
        createdEventUrl = response.details.htmlLink;
        openButton.style.display = 'block';
      }
      
      // Reset button after 2 seconds
      setTimeout(() => {
        stashButton.disabled = false;
        stashButton.textContent = 'Stash It';
      }, 2000);

    } catch (error) {
      // Show error message
      statusDiv.textContent = error.message;
      statusDiv.className = 'status error';
      statusDiv.style.display = 'block';
      
      // Reset button
      stashButton.disabled = false;
      stashButton.textContent = 'Stash It';
      
      // Hide open button in case of error
      openButton.style.display = 'none';
    }
  });
  
  // Add event listener for the open button
  openButton.addEventListener('click', () => {
    if (createdEventUrl) {
      chrome.tabs.create({ url: createdEventUrl });
    }
  });
});