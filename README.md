# RateMySJSU

## Overview

The RateMySJSU is a Google Chrome extension designed to integrate RateMyProfessors (RMP) data directly into the class schedule tables at `https://www.sjsu.edu/classes/schedules/*`. This extension enriches the standard schedule view by providing additional insights into professors' ratings, aiding students in making informed decisions when selecting courses.

## Features

- **RateMyProfessors Integration**: Automatically adds RMP ratings for each professor listed in the SJSU class schedule.
- **Seamless Experience**: Integrates directly into the SJSU class schedules web pages without disrupting the user interface.
- **Real-time Data**: Scrapes and displays the most current RMP data as of December 1st.
- **User-friendly Interface**: Easy-to-read additional information, seamlessly blending with the existing webpage design.

## Installation

1. Download the extension from the [GitHub repository](https://github.com/JovelRamos/RateMySJSU).
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable 'Developer Mode' at the top-right corner.
4. Click on 'Load unpacked' and select the downloaded extension folder.
5. The extension should now be active on your Chrome browser.

## Usage

- Navigate to any class schedule page within the `sjsu.edu/classes/schedules` domain.
- The extension will automatically enhance the table with RMP data.

## Technical Details

- **Languages Used**: HTML, CSS, JavaScript
- **APIs and Libraries**: Chrome Offscreen API, Chrome Runtime API, DOMParser Web API
- **Compatibility**: Google Chrome (Version 109+)

## Contributing

We welcome contributions to the SJSU RMP Extension! If you're interested in improving the extension or adding new features, please fork the repository and submit a pull request.

## Disclaimer

This extension is developed independently and is not officially affiliated with San Jose State University or RateMyProfessors.

## Support

For support, feature requests, or bug reporting, please open an issue in the [GitHub repository](https://github.com/JovelRamos/RateMySJSU).
