/**
 * WordPress dependencies
 */
import { ToolbarButton } from '@wordpress/components';
import { _x, __, sprintf } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import {
	privateApis as blockEditorPrivateApis,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { store as coreStore } from '@wordpress/core-data';

/**
 * External dependencies
 */
import clsx from 'clsx';

/**
 * Internal dependencies
 */
import { unlock } from '../../lock-unlock';
import { store as editorStore } from '../../store';

const { CommentIconToolbarSlotFill } = unlock( blockEditorPrivateApis );

const CommentAvatarIndicator = ( { onClick } ) => {
	const { threadParticipants, hasUnresolved, hasMoreComments } = useSelect(
		( select ) => {
			const { getBlockAttributes, getSelectedBlockClientId } =
				select( blockEditorStore );
			const { getCurrentPostId } = select( editorStore );
			const selectedBlock = getSelectedBlockClientId();
			const selectedBlockAttributes = selectedBlock
				? getBlockAttributes( selectedBlock )
				: null;
			const postId = getCurrentPostId();

			// Get comment data for this block.
			const blockCommentIdValue = selectedBlockAttributes?.blockCommentId;
			const participantsMap = new Map();
			let isResolved = false;
			let moreCommentsExist = false;

			if ( blockCommentIdValue && postId ) {
				const queryArgs = {
					post: postId,
					type: 'block_comment',
					status: 'any',
					per_page: 100,
				};

				const comments = select( coreStore ).getEntityRecords(
					'root',
					'comment',
					queryArgs
				);

				// Check if there are more pages available.
				const totalPages = select(
					coreStore
				).getEntityRecordsTotalPages( 'root', 'comment', queryArgs );

				// If we have more than 1 page, there are more comments
				if ( totalPages && totalPages > 1 ) {
					moreCommentsExist = true;
				}

				if ( comments ) {
					// Get all comments in this thread.
					// Main comment has id === blockCommentIdValue
					// Replies have parent === blockCommentIdValue
					const threadComments = comments.filter(
						( comment ) =>
							comment.status !== 'trash' &&
							( comment.id === blockCommentIdValue ||
								comment.parent === blockCommentIdValue )
					);

					// Sort by date to show participants in chronological order.
					threadComments.sort(
						( a, b ) => new Date( a.date ) - new Date( b.date )
					);

					// Find the main thread comment (first comment).
					const mainComment = threadComments.find(
						( comment ) => comment.id === blockCommentIdValue
					);

					// If no main comment is found, the thread doesn't exist.
					if ( ! mainComment ) {
						return {
							threadParticipants: [],
							hasUnresolved: false,
							hasMoreComments: false,
						};
					}

					// Thread is resolved if the main comment is approved.
					isResolved = mainComment.status === 'approved';

					threadComments.forEach( ( comment ) => {
						// Track thread participants (original commenter + repliers)
						if (
							comment.author_name &&
							comment.author_avatar_urls
						) {
							const authorKey = `${ comment.author }-${ comment.author_name }`;
							if ( ! participantsMap.has( authorKey ) ) {
								participantsMap.set( authorKey, {
									name: comment.author_name,
									avatar:
										comment.author_avatar_urls?.[ '48' ] ||
										comment.author_avatar_urls?.[ '96' ],
									isOriginalCommenter:
										comment.id === blockCommentIdValue,
									date: comment.date,
								} );
							}
						}
					} );
				}
			}

			// Convert to array and maintain chronological order.
			const participants = Array.from( participantsMap.values() );

			return {
				threadParticipants: participants,
				hasUnresolved: ! isResolved,
				hasMoreComments: moreCommentsExist,
			};
		},
		[]
	);

	if ( ! threadParticipants.length ) {
		return null;
	}

	// Show up to 3 avatars, with overflow indicator.
	const maxAvatars = 3;
	const visibleParticipants = threadParticipants.slice( 0, maxAvatars );
	const overflowCount = Math.max( 0, threadParticipants.length - maxAvatars );

	// If we hit the comment limit, show "100+" instead of exact overflow count.
	const overflowText =
		hasMoreComments && overflowCount > 0
			? __( '100+' )
			: sprintf(
					// translators: %s: Number of comments.
					__( '+%s' ),
					overflowCount
			  );

	const overflowTitle =
		hasMoreComments && overflowCount > 0
			? __( '100+ participants' )
			: sprintf(
					// translators: %s: Number of comments.
					__( '+%s more participants' ),
					overflowCount
			  );

	return (
		<CommentIconToolbarSlotFill.Fill>
			<ToolbarButton
				className={ clsx( 'comment-avatar-indicator', {
					'has-unresolved': hasUnresolved,
				} ) }
				label={ _x( 'View comments', 'View comment thread' ) }
				onClick={ onClick }
				showTooltip
			>
				<div className="comment-avatar-stack">
					{ visibleParticipants.map( ( participant, index ) => (
						<img
							key={ participant.name + index }
							src={ participant.avatar }
							alt={ participant.name }
							className="comment-avatar"
							style={ { zIndex: maxAvatars - index } }
						/>
					) ) }
					{ overflowCount > 0 && (
						<div
							className="comment-avatar-overflow"
							style={ { zIndex: 0 } }
							title={ overflowTitle }
						>
							{ overflowText }
						</div>
					) }
				</div>
			</ToolbarButton>
		</CommentIconToolbarSlotFill.Fill>
	);
};

export default CommentAvatarIndicator;
