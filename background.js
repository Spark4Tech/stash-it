// Handle OAuth token management
let accessToken = null;

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "stashFile") {
    handleStashFile(request.fileUrl, request.eventDateTime, request.eventName)
      .then(result => {
        console.log('Calendar event created successfully:', result);
        sendResponse({ success: true, message: "Event created!", details: result });
      })
      .catch(error => {
        console.error('Error creating calendar event:', error);
        sendResponse({ success: false, message: error.message });
      });
    return true; // Will respond asynchronously
  }
});

/**
 * Handles creating a calendar event for the stashed file
 * @param {string} fileUrl - URL to stash
 * @param {string} eventDateTime - ISO date string for the event
 * @param {string} eventName - Name for the calendar event
 * @returns {Promise} - Calendar event result
 */
async function handleStashFile(fileUrl, eventDateTime, eventName) {
  try {
    // Ensure we have a valid token
    accessToken = await getAuthToken();
    
    // Create calendar event
    const event = await createCalendarEvent({
      summary: eventName,
      description: `Review webpage: ${fileUrl}`,
      startDateTime: eventDateTime,
      duration: 30 // minutes
    });
    
    // Show notification
    if (event && event.htmlLink) {
      showNotification(
        'Calendar Event Created',
        `"${event.summary}" has been added to your calendar`,
        event.id,
        event.htmlLink
      );
    }
    
    return event;
  } catch (error) {
    console.error('Error in handleStashFile:', error);
    throw error;
  }
}

/**
 * Gets an OAuth token for Google Calendar API
 * @returns {Promise<string>} - Token string
 */
async function getAuthToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(token);
      }
    });
  });
}

/**
 * Creates a calendar event
 * @param {Object} eventDetails - Event details
 * @returns {Promise<Object>} - Created event
 */
async function createCalendarEvent({ summary, description, startDateTime, duration }) {
  try {
    const endDateTime = new Date(new Date(startDateTime).getTime() + duration * 60000).toISOString();
    
    const event = {
      summary,
      description,
      start: {
        dateTime: startDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 10 }
        ]
      }
    };
    
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      
      // User-friendly error messages
      let errorMessage = 'Failed to create calendar event';
      
      if (errorData.error) {
        if (errorData.error.code === 401) {
          errorMessage = 'Authentication error. Please try again.';
        } else if (errorData.error.code === 403) {
          errorMessage = 'Permission denied. Please check your Google Calendar permissions.';
        } else if (errorData.error.message) {
          errorMessage = `Error: ${errorData.error.message}`;
        }
      }
      
      throw new Error(errorMessage);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in createCalendarEvent:', error);
    throw error;
  }
}

/**
 * Shows a notification for the created event
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} eventId - Calendar event ID
 * @param {string} eventUrl - Calendar event URL
 */
function showNotification(title, message, eventId, eventUrl) {
  chrome.notifications.create(
    eventId, // Use eventId as notification ID for reference
    {
      type: 'basic',
      iconUrl: 'images/icon128.png',
      title: title,
      message: message,
      buttons: [
        { title: 'Open Event' }
      ],
      priority: 2
    }
  );
  
  // Store the URL for reference when notification is clicked
  chrome.storage.local.set({ [eventId]: eventUrl });
}

// Handle notification clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) { // "Open Event" button
    openStoredEventUrl(notificationId);
  }
});

// Handle direct notification clicks
chrome.notifications.onClicked.addListener(openStoredEventUrl);

/**
 * Opens the event URL stored for a notification ID
 * @param {string} notificationId - Notification ID
 */
function openStoredEventUrl(notificationId) {
  chrome.storage.local.get(notificationId, (result) => {
    const eventUrl = result[notificationId];
    if (eventUrl) {
      chrome.tabs.create({ url: eventUrl });
    }
  });
}