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

async function handleStashFile(fileUrl, eventDateTime, eventName) {
  try {
    // Ensure we have a valid token
    console.log('Getting auth token...');
    accessToken = await getAuthToken();
    console.log('Token received');

    // If it's a Google Drive file, get its details
    let finalEventName = eventName;
    if (fileUrl.match(/https:\/\/(docs|sheets|slides)\.google\.com/)) {
      try {
        console.log('Fetching Google Drive file details...');
        const fileDetails = await getFileDetails(fileUrl, accessToken);
        finalEventName = `Review: ${fileDetails.name}`;
        console.log('File details:', fileDetails);
      } catch (error) {
        console.warn('Could not fetch Drive file details, using provided name:', error);
      }
    }
    
    // Create calendar event
    console.log('Creating calendar event...');
    const event = await createCalendarEvent({
      summary: finalEventName,
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

async function getAuthToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        console.error('Auth token error:', chrome.runtime.lastError);
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(token);
      }
    });
  });
}

async function getFileDetails(fileUrl, token) {
  try {
    // Extract file ID from URL
    const fileId = extractFileId(fileUrl);
    console.log('Extracted file ID:', fileId);
    
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Drive API error:', errorData);
      throw new Error('Failed to fetch file details: ' + errorData.error?.message || response.statusText);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error in getFileDetails:', error);
    throw error;
  }
}

function extractFileId(url) {
  const match = url.match(/[-\w]{25,}/);
  if (!match) {
    throw new Error('Could not extract file ID from URL');
  }
  return match[0];
}

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
      // Add reminders
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 10 }
        ]
      }
    };
    
    console.log('Creating calendar event with data:', event);
    
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
      console.error('Calendar API error:', errorData);
      
      // More user-friendly error messages
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
    
    const result = await response.json();
    console.log('Calendar event created:', result);
    return result;
  } catch (error) {
    console.error('Error in createCalendarEvent:', error);
    throw error;
  }
}

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
    chrome.storage.local.get(notificationId, (result) => {
      const eventUrl = result[notificationId];
      if (eventUrl) {
        chrome.tabs.create({ url: eventUrl });
      }
    });
  }
});

// Handle direct notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.storage.local.get(notificationId, (result) => {
    const eventUrl = result[notificationId];
    if (eventUrl) {
      chrome.tabs.create({ url: eventUrl });
    }
  });
});