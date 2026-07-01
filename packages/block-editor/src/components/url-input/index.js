/**
 * External dependencies
 */
import clsx from 'clsx';

/**
 * WordPress dependencies
 */
import { __, sprintf, _n } from '@wordpress/i18n';
import {
	useEffect,
	useRef,
	useCallback,
	useMemo,
	useReducer,
} from '@wordpress/element';
import { UP, DOWN, ENTER, TAB } from '@wordpress/keycodes';
import {
	BaseControl,
	Button,
	__experimentalInputControl as InputControl,
	Spinner,
	withSpokenMessages,
	Popover,
	privateApis as componentsPrivateApis,
} from '@wordpress/components';
import {
	compose,
	debounce,
	withInstanceId,
	withSafeTimeout,
} from '@wordpress/compose';
import { useSelect } from '@wordpress/data';
import { isURL } from '@wordpress/url';

/**
 * Internal dependencies
 */
import { store as blockEditorStore } from '../../store';
import { unlock } from '../../lock-unlock';

const { ValidatedInputControl } = unlock( componentsPrivateApis );

/**
 * Whether the argument is a function.
 *
 * @param {*} maybeFunc The argument to check.
 * @return {boolean} True if the argument is a function, false otherwise.
 */
function isFunction( maybeFunc ) {
	return 'function' === typeof maybeFunc;
}

// Reducer state and actions for managing component's state.
const initialState = {
	suggestions: [],
	showSuggestions: false,
	selectedSuggestion: null,
	loading: false,
	suggestionsValue: null,
};

/**
 * Reducer handling the state of the URL input component.
 *
 * The reducer is handling the following actions:
 *
 * - FETCH_START: For when suggestion fetching starts.
 * - FETCH_SUCCESS: Suggestions fetched successfully.
 * - FETCH_FAILURE: Suggestions fetching failed.
 * - CLEAR: Clear the suggestions and reset the state.
 * - SHOW_SUGGESTIONS: Show the suggestions popover.
 * - HIDE_SUGGESTIONS: Hide the suggestions popover.
 * - SELECT_SUGGESTION: Hides suggestions & clears suggestion initially when a suggestion is selected.
 * - SET_SELECTED_SUGGESTION: Handles setting the selected suggestion index.
 *
 * @param {Object} state  The current state of the URL input component.
 * @param {Object} action The action to be handled.
 *
 * @return {Object} The updated state of the URL input component.
 */
function reducer( state, action ) {
	switch ( action.type ) {
		case 'FETCH_START':
			return {
				...state,
				loading: true,
				selectedSuggestion: null,
			};
		case 'FETCH_SUCCESS':
			return {
				...state,
				loading: false,
				suggestions: action.payload.suggestions,
				suggestionsValue: action.payload.suggestionsValue,
				showSuggestions: !! action.payload.suggestions.length,
			};
		case 'FETCH_FAILURE':
			return {
				...state,
				loading: false,
			};
		case 'CLEAR':
			return {
				...state,
				suggestions: [],
				showSuggestions: false,
				suggestionsValue: action.payload.suggestionsValue,
			};
		case 'SHOW_SUGGESTIONS':
			return {
				...state,
				showSuggestions: true,
			};
		case 'HIDE_SUGGESTIONS':
			return {
				...state,
				showSuggestions: false,
			};
		case 'SELECT_SUGGESTION':
			return {
				...state,
				showSuggestions: false,
				selectedSuggestion: null,
			};
		case 'SET_SELECTED_SUGGESTION':
			return {
				...state,
				selectedSuggestion: action.payload,
			};
	}
	return state;
}

/**
 * URL input component.
 *
 * @param {Object}   props                                        The component props.
 * @param {string}   [props.className]                            Additional class names.
 * @param {boolean}  [props.disableSuggestions]                   Whether to disable suggestions.
 * @param {string}   [props.value]                                The input value.
 * @param {Function} props.onChange                               A function to be called when the input value changes.
 * @param {Function} [props.onKeyDown]                            A function to be called on keydown.
 * @param {Function} [props.onSubmit]                             A function to be called on submit.
 * @param {string}   [props.label]                                The label for the input.
 * @param {boolean}  [props.isFullWidth]                          Whether the input should be full width.
 * @param {boolean}  [props.hideLabelFromVision]                  Whether to hide the label from vision.
 * @param {string}   [props.placeholder]                          The placeholder for the input.
 * @param {Object}   [props.suffix]                               A suffix to be rendered after the input.
 * @param {Function} [props.__experimentalFetchLinkSuggestions]   A function to fetch link suggestions.
 * @param {boolean}  [props.__experimentalHandleURLSuggestions]   Whether to handle URL suggestions.
 * @param {boolean}  [props.__experimentalShowInitialSuggestions] Whether to show initial suggestions.
 * @param {Function} [props.__experimentalRenderControl]          A function to render the control.
 * @param {Function} [props.__experimentalRenderSuggestions]      A function to render the suggestions.
 * @param {Object}   [props.autocompleteRef]                      A ref for the autocomplete popover.
 * @param {string}   props.instanceId                             The instance ID of the component.
 * @param {Function} props.speak                                  A function to speak a message.
 * @param {Function} props.debouncedSpeak                         A function to speak a message with a debounce.
 * @return {React.JSX.Element} The component.
 */
function URLInput( props ) {
	const {
		__experimentalFetchLinkSuggestions: fetchLinkSuggestionsProp,
		__experimentalHandleURLSuggestions: handleURLSuggestions,
		__experimentalRenderControl: renderControl,
		__experimentalRenderSuggestions: renderSuggestions,
		__experimentalShowInitialSuggestions = false,
		autocompleteRef: autocompleteRefProp,
		className,
		debouncedSpeak,
		disableSuggestions,
		hideLabelFromVision = false,
		instanceId,
		isFullWidth,
		label = null,
		onChange,
		onKeyDown: onKeyDownProp,
		onSubmit,
		placeholder = __( 'Paste URL or type to search' ),
		speak,
		suffix,
		required,
		customValidity,
		markWhenOptional,
		value = '',
	} = props;

	// States managed by the reducer pattern.
	const [ state, dispatch ] = useReducer( reducer, initialState );
	const {
		suggestions,
		showSuggestions,
		selectedSuggestion,
		loading,
		suggestionsValue,
	} = state;

	// Refs for DOM nodes and instance variables that don't trigger re-renders.
	const inputRef = useRef( null );
	const autocompleteRef = useRef( autocompleteRefProp?.current );
	const suggestionNodes = useRef( [] );
	const suggestionsRequest = useRef( null );
	const hasRenderedValidationRef = useRef( false );

	// Fetch link suggestions from the block editor store if not provided via props.
	const { fetchLinkSuggestionsFromStore } = useSelect(
		( select ) => {
			if ( isFunction( fetchLinkSuggestionsProp ) ) {
				return { fetchLinkSuggestionsFromStore: null };
			}
			const { getSettings } = select( blockEditorStore );
			return {
				fetchLinkSuggestionsFromStore:
					getSettings().__experimentalFetchLinkSuggestions,
			};
		},
		[ fetchLinkSuggestionsProp ]
	);

	const fetchLinkSuggestions =
		fetchLinkSuggestionsProp || fetchLinkSuggestionsFromStore;

	/**
	 * Updates the suggestions based on the input value.
	 * This function is debounced to avoid excessive API calls.
	 *
	 * @param {string} [inputValue=''] The value to search for.
	 */
	const updateSuggestions = useCallback(
		( inputValue = '' ) => {
			if ( ! fetchLinkSuggestions ) {
				return;
			}

			/**
			 * Initial suggestions may only show if there is no value
			 * (note: this includes whitespace).
			 */
			const isInitialSuggestions = ! inputValue?.length;

			/**
			 * Trim only now we've determined whether or not it originally had a "length"
			 * (even if that value was all whitespace).
			 */
			const trimmedValue = inputValue.trim();

			/**
			 * Allow a suggestions request if:
			 * - there are at least 2 characters in the search input (except manual searches where
			 *   search input length is not required to trigger a fetch)
			 * - this is a direct entry (eg: a URL)
			 */
			if (
				! isInitialSuggestions &&
				( 2 > trimmedValue.length ||
					( ! handleURLSuggestions && isURL( trimmedValue ) ) )
			) {
				suggestionsRequest.current?.cancel?.();
				suggestionsRequest.current = null;
				dispatch( {
					type: 'CLEAR',
					payload: { suggestionsValue: trimmedValue },
				} );
				return;
			}

			dispatch( { type: 'FETCH_START' } );

			const request = fetchLinkSuggestions( trimmedValue, {
				isInitialSuggestions,
			} );
			suggestionsRequest.current = request;

			request
				.then( ( newSuggestions ) => {
					/**
					 * A fetch Promise doesn't have an abort option. It's mimicked by
					 * comparing the request reference on the instance, which is
					 * reset or deleted on subsequent requests or unmounting.
					 */
					if ( request !== suggestionsRequest.current ) {
						return;
					}

					dispatch( {
						type: 'FETCH_SUCCESS',
						payload: {
							suggestions: newSuggestions,
							suggestionsValue: trimmedValue,
						},
					} );

					if ( !! newSuggestions.length ) {
						debouncedSpeak(
							sprintf(
								/* translators: %d: number of results. */
								_n(
									'%d result found, use up and down arrow keys to navigate.',
									'%d results found, use up and down arrow keys to navigate.',
									newSuggestions.length
								),
								newSuggestions.length
							),
							'assertive'
						);
					} else {
						debouncedSpeak( __( 'No results.' ), 'assertive' );
					}
				} )
				.catch( () => {
					if ( request !== suggestionsRequest.current ) {
						return;
					}
					dispatch( { type: 'FETCH_FAILURE' } );
				} )
				.finally( () => {
					/**
					 * If this is the current promise then reset the reference
					 * to allow for checking if a new request is made.
					 */
					if ( request === suggestionsRequest.current ) {
						suggestionsRequest.current = null;
					}
				} );
		},
		[ fetchLinkSuggestions, handleURLSuggestions, debouncedSpeak ]
	);

	/**
	 * Create a debounced version of `updateSuggestions` using useMemo to prevent
	 * re-creating the debounced function on every render.
	 */
	const debouncedUpdateSuggestions = useMemo(
		() => debounce( updateSuggestions, 200 ),
		[ updateSuggestions ]
	);

	/**
	 * Manages fetching and showing suggestions based
	 * on prop changes. Also contains all cleanup logic.
	 */
	useEffect( () => {
		// When value changes, we want to reset the selected suggestion.
		dispatch( { type: 'SET_SELECTED_SUGGESTION', payload: null } );

		if ( disableSuggestions ) {
			dispatch( { type: 'CLEAR', payload: { suggestionsValue: null } } );
			return;
		}

		if ( value?.length ) {
			debouncedUpdateSuggestions( value );
		} else if ( __experimentalShowInitialSuggestions ) {
			debouncedUpdateSuggestions();
		} else {
			// Hide suggestions if value is cleared and not showing initial ones.
			dispatch( { type: 'CLEAR', payload: { suggestionsValue: null } } );
		}

		// Cleanup function to cancel any pending requests or debounced calls.
		return () => {
			suggestionsRequest.current?.cancel?.();
			debouncedUpdateSuggestions.cancel();
		};
	}, [
		value,
		disableSuggestions,
		__experimentalShowInitialSuggestions,
		debouncedUpdateSuggestions,
	] );

	/**
	 * Runs when the selected suggestion changes.
	 * It scrolls the selected suggestion into view.
	 */
	useEffect( () => {
		/**
		 * Only have to worry about scrolling selected suggestion into view
		 * when already expanded and there is a selected suggestion.
		 */
		if (
			showSuggestions &&
			null !== selectedSuggestion &&
			suggestionNodes.current[ selectedSuggestion ]
		) {
			suggestionNodes.current[ selectedSuggestion ].scrollIntoView( {
				behavior: 'instant',
				block: 'nearest',
				inline: 'nearest',
			} );
		}
	}, [ showSuggestions, selectedSuggestion ] );

	/**
	 * Binds a suggestion node to the `suggestionNodes` ref.
	 *
	 * @param {number} index The index of the suggestion.
	 * @return {Function} A function that takes a ref and binds it.
	 */
	const bindSuggestionNode = useCallback( ( index ) => {
		return ( ref ) => {
			suggestionNodes.current[ index ] = ref;
		};
	}, [] );

	/**
	 * Handles the selection of a link from the suggestions.
	 *
	 * @param {Object} suggestion The selected suggestion.
	 */
	const selectLink = useCallback(
		( suggestion ) => {
			onChange( suggestion.url, suggestion );
			dispatch( { type: 'SELECT_SUGGESTION' } );
		},
		[ onChange ]
	);

	/**
	 * Handles clicks on a suggestion item.
	 *
	 * @param {Object} suggestion The clicked suggestion.
	 */
	const handleOnClick = useCallback(
		( suggestion ) => {
			selectLink( suggestion );
			// Move focus to the input field when a link suggestion is clicked.
			inputRef.current?.focus();
		},
		[ selectLink ]
	);

	/**
	 * Handles the focus event on the input field.
	 * It may trigger an update of suggestions.
	 */
	const onFocus = useCallback( () => {
		/**
		 * When opening the link editor, if there's a value present, we want to load the suggestions pane with the results for this input search value
		 * Don't re-run the suggestions on focus if there are already suggestions present (prevents searching again when tabbing between the input and buttons)
		 * or there is already a request in progress.
		 */
		if (
			value &&
			! disableSuggestions &&
			! ( suggestions && suggestions.length ) &&
			! suggestionsRequest.current
		) {
			// Ensure the suggestions are updated with the current input value.
			updateSuggestions( value );
		} else if (
			__experimentalShowInitialSuggestions &&
			! ( value && value.length )
		) {
			updateSuggestions();
		}

		// If there are suggestions, show them on focus.
		if ( 0 < suggestions.length ) {
			dispatch( { type: 'SHOW_SUGGESTIONS' } );
		}
	}, [
		value,
		disableSuggestions,
		suggestions,
		updateSuggestions,
		__experimentalShowInitialSuggestions,
	] );

	/**
	 * Handles keydown events on the input field.
	 * Used for keyboard navigation of suggestions.
	 *
	 * @param {Object} event The keydown event.
	 */
	const onKeyDown = useCallback(
		( event ) => {
			onKeyDownProp?.( event );
			/**
			 * If the suggestions are not shown or loading, we shouldn't handle the arrow keys
			 * We shouldn't preventDefault to allow block arrow keys navigation.
			 */
			if ( ! showSuggestions || ! suggestions.length || loading ) {
				/**
				 * In the Windows version of Firefox the up and down arrows don't move the caret
				 * within an input field like they do for Mac Firefox/Chrome/Safari. This causes
				 * a form of focus trapping that is disruptive to the user experience. This disruption
				 * only happens if the caret is not in the first or last position in the text input.
				 * See: https://github.com/WordPress/gutenberg/issues/5693#issuecomment-436684747
				 */
				switch ( event.keyCode ) {
					/**
					 * When UP is pressed, if the caret is at the start of the text, move it to the 0
					 * position.
					 */
					case UP: {
						if ( 0 !== event.target.selectionStart ) {
							event.preventDefault();

							// Set the input caret to position 0.
							event.target.setSelectionRange( 0, 0 );
						}
						break;
					}
					/**
					 * When DOWN is pressed, if the caret is not at the end of the text, move it to the
					 * last position.
					 */
					case DOWN: {
						if ( value.length !== event.target.selectionStart ) {
							event.preventDefault();

							// Set the input caret to the last position.
							event.target.setSelectionRange(
								value.length,
								value.length
							);
						}
						break;
					}

					/**
					 * Submitting while loading should trigger onSubmit.
					 */
					case ENTER: {
						if ( onSubmit ) {
							event.preventDefault();
							onSubmit( null, event );
						}
						break;
					}
				}

				return;
			}

			const suggestion = suggestions[ selectedSuggestion ];

			switch ( event.keyCode ) {
				case UP: {
					event.preventDefault();
					const previousIndex =
						null === selectedSuggestion || 0 === selectedSuggestion
							? suggestions.length - 1
							: selectedSuggestion - 1;
					dispatch( {
						type: 'SET_SELECTED_SUGGESTION',
						payload: previousIndex,
					} );
					break;
				}
				case DOWN: {
					event.preventDefault();
					const nextIndex =
						null === selectedSuggestion ||
						selectedSuggestion === suggestions.length - 1
							? 0
							: selectedSuggestion + 1;
					dispatch( {
						type: 'SET_SELECTED_SUGGESTION',
						payload: nextIndex,
					} );
					break;
				}
				case TAB: {
					if ( suggestion ) {
						selectLink( suggestion );
						// Announce a link has been selected when tabbing away from the input field.
						speak( __( 'Link selected.' ) );
					}
					break;
				}
				case ENTER: {
					event.preventDefault();
					if ( suggestion ) {
						selectLink( suggestion );
						onSubmit?.( suggestion, event );
					} else {
						onSubmit?.( null, event );
					}
					break;
				}
			}
		},
		[
			onKeyDownProp,
			showSuggestions,
			suggestions,
			loading,
			selectedSuggestion,
			value,
			selectLink,
			onSubmit,
			speak,
		]
	);

	// Derived values for ARIA attributes.
	const suggestionsListboxId = `block-editor-url-input-suggestions-${ instanceId }`;
	const suggestionOptionIdPrefix = `block-editor-url-input-suggestion-${ instanceId }`;
	const inputId = `url-input-control-${ instanceId }`;

	const shouldShowSuggestionsPopover =
		! disableSuggestions && showSuggestions && !! suggestions.length;

	/**
	 * Renders the main input control.
	 *
	 * @return {React.JSX.Element} The input control.
	 */
	const renderControlComponent = () => {
		const controlProps = {
			id: inputId, // Passes attribute to label for the for attribute
			label,
			className: clsx( 'block-editor-url-input', className, {
				'is-full-width': isFullWidth,
			} ),
			hideLabelFromVision,
		};

		const inputProps = {
			id: inputId,
			value,
			required: required ?? true,
			type: 'text',
			onChange,
			onFocus,
			placeholder,
			onKeyDown,
			role: 'combobox',
			'aria-label': label ? undefined : __( 'URL' ), // Ensure input always has an accessible label
			'aria-expanded': shouldShowSuggestionsPopover,
			'aria-autocomplete': 'list',
			'aria-owns': suggestionsListboxId,
			'aria-activedescendant':
				null !== selectedSuggestion
					? `${ suggestionOptionIdPrefix }-${ selectedSuggestion }`
					: undefined,
			ref: inputRef,
			suffix,
		};

		const validationProps = {
			customValidity,
			...( markWhenOptional !== undefined && {
				markWhenOptional,
			} ),
		};

		if ( renderControl ) {
			return renderControl( controlProps, inputProps, loading );
		}

		// Use ValidatedInputControl if customValidity has ever had a non-undefined value.
		if ( customValidity !== undefined ) {
			hasRenderedValidationRef.current = true;
		}

		const MaybeValidatedInputControl = hasRenderedValidationRef.current
			? ValidatedInputControl
			: InputControl;

		return (
			<BaseControl { ...controlProps }>
				<MaybeValidatedInputControl
					{ ...inputProps }
					{ ...( hasRenderedValidationRef.current
						? validationProps
						: {} ) }
					__next40pxDefaultSize
				/>
				{ loading && <Spinner /> }
			</BaseControl>
		);
	};

	/**
	 * Renders the suggestions popover.
	 *
	 * @return {React.JSX.Element|null} The suggestions popover or null.
	 */
	const renderSuggestionsComponent = () => {
		if ( ! shouldShowSuggestionsPopover ) {
			return null;
		}

		const suggestionsListProps = {
			id: suggestionsListboxId,
			ref: autocompleteRef,
			role: 'listbox',
		};

		const buildSuggestionItemProps = ( _suggestion, index ) => ( {
			role: 'option',
			tabIndex: '-1',
			id: `${ suggestionOptionIdPrefix }-${ index }`,
			ref: bindSuggestionNode( index ),
			'aria-selected': index === selectedSuggestion ? true : undefined,
		} );

		if ( isFunction( renderSuggestions ) ) {
			return renderSuggestions( {
				suggestions,
				selectedSuggestion,
				suggestionsListProps,
				buildSuggestionItemProps,
				isLoading: loading,
				handleSuggestionClick: handleOnClick,
				isInitialSuggestions: ! suggestionsValue?.length,
				currentInputValue: suggestionsValue,
			} );
		}

		return (
			<Popover placement="bottom" focusOnMount={ false }>
				<div
					{ ...suggestionsListProps }
					className={ clsx( 'block-editor-url-input__suggestions', {
						[ `${ className }__suggestions` ]: className,
					} ) }
				>
					{ suggestions.map( ( suggestion, index ) => (
						<Button
							__next40pxDefaultSize
							{ ...buildSuggestionItemProps( suggestion, index ) }
							key={ suggestion.id }
							className={ clsx(
								'block-editor-url-input__suggestion',
								{
									'is-selected': index === selectedSuggestion,
								}
							) }
							onClick={ () => handleOnClick( suggestion ) }
						>
							{ suggestion.title }
						</Button>
					) ) }
				</div>
			</Popover>
		);
	};

	return (
		<>
			{ renderControlComponent() }
			{ renderSuggestionsComponent() }
		</>
	);
}

/**
 * @see https://github.com/WordPress/gutenberg/blob/HEAD/packages/block-editor/src/components/url-input/README.md
 */
export default compose(
	withSafeTimeout,
	withSpokenMessages,
	withInstanceId
)( URLInput );
