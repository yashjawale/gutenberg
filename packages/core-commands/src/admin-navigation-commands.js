/**
 * WordPress dependencies
 */
import { useCommandLoader } from '@wordpress/commands';
import { __, sprintf } from '@wordpress/i18n';
import { external } from '@wordpress/icons';
import { useMemo } from '@wordpress/element';
import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { getPath } from '@wordpress/url';

const getAdminNavigationCommands = ( menuCommands ) =>
	function useAdminBasicNavigationCommands() {
		const { isBlockBasedTheme, canCreateTemplate } = useSelect(
			( select ) => {
				return {
					isBlockBasedTheme:
						select( coreStore ).getCurrentTheme()?.is_block_theme,
					canCreateTemplate: select( coreStore ).canUser( 'create', {
						kind: 'postType',
						name: 'wp_template',
					} ),
				};
			},
			[]
		);

		const commands = useMemo( () => {
			const isSiteEditor = getPath( window.location.href )?.includes(
				'site-editor.php'
			);

			// Filter out Pages command in site editor when user can access site editor.
			const filteredMenuCommands = ( menuCommands ?? [] ).filter(
				( menuCommand ) => {
					const isPagesCommand =
						menuCommand.name === 'edit.php?post_type=page';
					const shouldFilterPages =
						isSiteEditor &&
						canCreateTemplate &&
						isBlockBasedTheme &&
						isPagesCommand;
					return ! shouldFilterPages;
				}
			);

			return filteredMenuCommands.map( ( menuCommand ) => {
				const label = sprintf(
					/* translators: %s: menu label */
					__( 'Go to: %s' ),
					menuCommand.label
				);
				return {
					label,
					searchLabel: label,
					name: menuCommand.name,
					url: menuCommand.url,
					callback: ( { close } ) => {
						document.location = menuCommand.url;
						close();
					},
				};
			} );
		}, [ isBlockBasedTheme, canCreateTemplate ] );

		return {
			commands,
			isLoading: false,
		};
	};

const getViewSiteCommand = () =>
	function useViewSiteCommand() {
		const homeUrl = useSelect( ( select ) => {
			// Site index.
			return select( coreStore ).getEntityRecord(
				'root',
				'__unstableBase'
			)?.home;
		}, [] );

		const commands = useMemo( () => {
			if ( ! homeUrl ) {
				return [];
			}

			return [
				{
					name: 'core/view-site',
					label: __( 'View site' ),
					icon: external,
					callback: ( { close } ) => {
						close();
						window.open( homeUrl, '_blank' );
					},
				},
			];
		}, [ homeUrl ] );

		return {
			isLoading: false,
			commands,
		};
	};

export function useAdminNavigationCommands( menuCommands ) {
	useCommandLoader( {
		name: 'core/admin-navigation',
		hook: getAdminNavigationCommands( menuCommands ),
	} );

	useCommandLoader( {
		name: 'core/view-site',
		hook: getViewSiteCommand(),
	} );
}
