document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const stashButton = document.getElementById('stashButton');
  const openButton = document.getElementById('openButton');
  const statusDiv = document.getElementById('status');
  const dateInput = document.getElementById('eventDate');
  const timeInput = document.getElementById('eventTime');
  const eventNameInput = document.getElementById('eventName');
  const saveDefaultCheck = document.getElementById('saveAsDefault');
  const spinner = document.getElementById('spinner');
  const buttonText = document.getElementById('buttonText');
  const closeBtn = document.getElementById('closeBtn');

  // Variable to store the event URL
  let createdEventUrl = '';

  // Set tomorrow's date as default
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(today.getDate() + 1);
  
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Initialize popup with saved settings and page title
  initializePopup();

  // Event listeners
  stashButton.addEventListener('click', handleStashButtonClick);
  openButton.addEventListener('click', handleOpenButtonClick);
  closeBtn.addEventListener('click', handleCloseButtonClick);
  document.getElementById('companyLink').addEventListener('click', function(e) {
    e.preventDefault();
    chrome.tabs.create({ url: this.href });
  });

  /**
   * Initializes the popup with saved settings and current tab info
   */
  function initializePopup() {
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
  }

  /**
   * Handles the stash button click event
   */
  async function handleStashButtonClick() {
    try {
      statusDiv.style.display = 'none';

      // Validate inputs
      if (!dateInput.value || !timeInput.value || !eventNameInput.value.trim()) {
        throw new Error('Please fill in all fields');
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      const dateTimeStr = `${dateInput.value}T${timeInput.value}:00`;
      const eventDateTime = new Date(dateTimeStr);

      if (isNaN(eventDateTime.getTime())) {
        throw new Error('Please select a valid date and time');
      }

      // Save user preferences if checkbox is checked
      if (saveDefaultCheck.checked) {
        chrome.storage.sync.set({ defaultTime: timeInput.value });
      }

      // Show loading state
      setLoadingState(true);

      // Send message to background script
      const response = await chrome.runtime.sendMessage({
        action: 'stashFile',
        fileUrl: tab.url,
        eventDateTime: eventDateTime.toISOString(),
        eventName: eventNameInput.value
      });

      // Handle response
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
      setLoadingState(false);
    }
  }

  /**
   * Sets the loading state of the stash button
   * @param {boolean} isLoading - Whether the button should show loading state
   */
  function setLoadingState(isLoading) {
    stashButton.disabled = isLoading;
    spinner.style.display = isLoading ? 'inline-block' : 'none';
    buttonText.textContent = isLoading ? 'Creating event...' : 'Stash It';
  }

  /**
   * Handles the open button click event
   */
  function handleOpenButtonClick() {
    if (createdEventUrl) {
      chrome.tabs.create({ url: createdEventUrl });
    }
  }

  /**
   * Handles the close button click event
   */
  function handleCloseButtonClick() {
    window.close();
  }
});