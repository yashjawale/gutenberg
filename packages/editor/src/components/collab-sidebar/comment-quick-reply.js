/**
 * WordPress dependencies
 */
import { useState } from '@wordpress/element';
import {
	__experimentalHStack as HStack,
	Button,
	__experimentalInputControl as InputControl,
} from '@wordpress/components';
import { _x, __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { sanitizeCommentString } from './utils';

/**
 * CommentQuickReply component.
 * Displayed on resolved thread to allow quick reply.
 * Also reopens the thread on submit.
 *
 * @param {Object}   props          - The component props.
 * @param {Function} props.onSubmit - The function to call when updating the comment.
 * @return {React.ReactNode} The CommentQuickReply component.
 */
function CommentQuickReply( { onSubmit } ) {
	const [ inputComment, setInputComment ] = useState( '' );

	const [ isFocused, setIsFocused ] = useState( false );

	return (
		<>
			<InputControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				value={ inputComment ?? '' }
				onChange={ setInputComment }
				label={ __( 'Reopen the thread & reply' ) }
				placeholder={ __( 'Replying will reopen this thread' ) }
				onFocus={ () => setIsFocused( true ) }
				hideLabelFromVision
			/>
			{ isFocused && (
				<HStack alignment="left" spacing="3" justify="flex-start">
					<Button
						__next40pxDefaultSize
						accessibleWhenDisabled
						variant="primary"
						onClick={ () => {
							onSubmit( inputComment );
							setInputComment( '' );
						} }
						disabled={
							0 === sanitizeCommentString( inputComment ).length
						}
						text={ _x( 'Reply', 'Add reply comment' ) }
					/>
					<Button
						__next40pxDefaultSize
						variant="tertiary"
						onClick={ () => {
							setIsFocused( false );
							setInputComment( '' );
						} }
						text={ _x( 'Cancel', 'Cancel comment button' ) }
					/>
				</HStack>
			) }
		</>
	);
}

export default CommentQuickReply;
