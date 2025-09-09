/**
 * Media query utilities for handling different screen resolutions.
 *
 * On 1x screens (non-retina), decimal pixel values in box-shadow spread-radius
 * can cause blurry rendering in Firefox. This provides utilities to apply
 * integer pixel values for 1x screens while maintaining sub-pixel precision
 * for higher resolution displays.
 */

/**
 * Media query for 1x resolution screens (non-retina displays).
 * Used to apply integer pixel values to prevent blurry rendering in Firefox.
 */
export const MEDIA_QUERY_1X =
	'@media (-webkit-max-device-pixel-ratio: 1), (max-resolution: 1dppx)';

/**
 * CSS utility function to apply different values for 1x vs higher resolution screens.
 *
 * @param {string} defaultValue - The default value (for high-DPI screens).
 * @param {string} oneXValue    - The value for 1x screens (should use integer pixels).
 *
 * @return {string} CSS with appropriate media queries.
 */
export function withOneXFallback( defaultValue, oneXValue ) {
	return `
		${ defaultValue };
		${ MEDIA_QUERY_1X } {
			${ oneXValue };
		}
	`;
}
