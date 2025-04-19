# Stash It

<img src="images/icon128.png" alt="Stash It Logo" width="100" height="100" align="right" />

Stash It is a Chrome extension that helps you save web pages to your Google Calendar for future review. Never lose track of important articles, documentation, or research again!

## Features

- Save the current tab as a calendar event with just a few clicks
- Schedule when you want to revisit the content
- Customizable event names and times
- Save default reminder times for quick scheduling
- Receive notifications when events are created
- Directly open calendar events from notifications

## Installation

### Chrome Web Store
The easiest way to install Stash It is from the Chrome Web Store:

1. Visit the [Stash It Chrome Web Store page](#) *(link coming soon)*
2. Click "Add to Chrome"
3. Follow the prompts to complete installation

### Manual Installation
To install manually from source:

1. Clone this repository or download it as a ZIP file
2. Unzip the file (if downloaded as ZIP)
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" by toggling the switch in the top right corner
5. Click "Load unpacked" and select the unzipped folder

## Usage

1. Navigate to a web page you want to revisit later
2. Click the Stash It icon in your browser toolbar
3. Enter a name for the event (defaults to "Review: [Page Title]")
4. Select a date and time
5. Click "Stash It"
6. The page will be saved as an event in your Google Calendar

When the event time arrives, you'll receive a notification from Google Calendar with a link back to the saved page.

## Permissions

Stash It requires the following permissions:

- **identity**: For Google Calendar authentication
- **tabs**: To access the current tab's URL and title
- **activeTab**: To interact with the current tab
- **storage**: To save your preferences
- **notifications**: To show notifications when events are created
- **www.googleapis.com**: To create events in Google Calendar

## Development

### Prerequisites
- Knowledge of HTML, CSS, and JavaScript
- Chrome browser

### Setup
1. Clone the repository
2. Make your changes
3. Test by loading the extension as described in the Manual Installation section

### Project Structure
- `popup.html` - The UI for the extension popup
- `popup.js` - JavaScript for the popup functionality
- `background.js` - Background service worker for handling API calls
- `styles/popup.css` - Styles for the popup UI
- `manifest.json` - Extension configuration
- `images/` - Extension icons

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built by [Spark4](https://spark4.tech)
- Icon designed by Steve

## Privacy

Stash It only accesses your Google Calendar with your explicit permission and only to create events. Stash-it does not store or transmit your browsing history or personal data to our own or any third-party servers.