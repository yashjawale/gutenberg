/**
 * WordPress dependencies
 */
import { ToolbarButton } from '@wordpress/components';
import { _x } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import {
	privateApis as blockEditorPrivateApis,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { store as coreStore } from '@wordpress/core-data';

/**
 * Internal dependencies
 */
import { unlock } from '../../lock-unlock';
import { store as editorStore } from '../../store';

const { CommentIconToolbarSlotFill } = unlock( blockEditorPrivateApis );

const CommentAvatarIndicator = ( { onClick } ) => {
	const { commenters, hasUnresolved } = useSelect( ( select ) => {
		const { getBlockAttributes, getSelectedBlockClientId } =
			select( blockEditorStore );
		const { getCurrentPostId } = select( editorStore );
		const selectedBlock = getSelectedBlockClientId();
		const selectedBlockAttributes = selectedBlock
			? getBlockAttributes( selectedBlock )
			: null;
		const postId = getCurrentPostId();

		// Get comment data for this block
		const blockCommentIdValue = selectedBlockAttributes?.blockCommentId;
		const commentersMap = new Map();
		let unresolvedCount = 0;

		if ( blockCommentIdValue && postId ) {
			const comments = select( coreStore ).getEntityRecords(
				'root',
				'comment',
				{
					post: postId,
					type: 'block_comment',
					status: 'any',
					per_page: 100,
				}
			);

			if ( comments ) {
				// Get all comments in this thread (main + replies)
				const threadComments = comments.filter(
					( comment ) =>
						comment.id === blockCommentIdValue ||
						comment.parent === blockCommentIdValue
				);

				threadComments.forEach( ( comment ) => {
					// Track unique commenters
					if ( comment.author_name && comment.author_avatar_urls ) {
						commentersMap.set( comment.author, {
							name: comment.author_name,
							avatar:
								comment.author_avatar_urls?.[ '48' ] ||
								comment.author_avatar_urls?.[ '96' ],
						} );
					}

					// Count unresolved comments
					if ( comment.status !== 'approved' ) {
						unresolvedCount++;
					}
				} );
			}
		}

		return {
			commenters: Array.from( commentersMap.values() ),
			hasUnresolved: unresolvedCount > 0,
		};
	}, [] );

	if ( ! commenters.length ) {
		return null;
	}

	const buttonLabel = hasUnresolved
		? _x(
				'View unresolved comments',
				'View comment thread with unresolved comments'
		  )
		: _x( 'View resolved comments', 'View resolved comment thread' );

	// Show up to 3 avatars, with overflow indicator
	const maxAvatars = 3;
	const visibleCommenters = commenters.slice( 0, maxAvatars );
	const overflowCount = Math.max( 0, commenters.length - maxAvatars );

	return (
		<CommentIconToolbarSlotFill.Fill>
			<ToolbarButton
				className={ `comment-avatar-indicator ${
					hasUnresolved ? 'has-unresolved' : 'all-resolved'
				}` }
				label={ buttonLabel }
				onClick={ onClick }
				showTooltip
			>
				<div className="comment-avatar-stack">
					{ visibleCommenters.map( ( commenter, index ) => (
						<img
							key={ commenter.name + index }
							src={ commenter.avatar }
							alt={ commenter.name }
							className="comment-avatar"
							style={ { zIndex: maxAvatars - index } }
						/>
					) ) }
					{ overflowCount > 0 && (
						<div
							className="comment-avatar-overflow"
							style={ { zIndex: 0 } }
						>
							+{ overflowCount }
						</div>
					) }
				</div>
			</ToolbarButton>
		</CommentIconToolbarSlotFill.Fill>
	);
};

export default CommentAvatarIndicator;
