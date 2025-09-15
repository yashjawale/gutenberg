<?php
/**
 * Updates the comment type in the REST API.
 *
 * This function is used as a filter callback for the 'rest_pre_insert_comment' hook.
 * It checks if the 'comment_type' parameter is set to 'block_comment' in the REST API request,
 * and if so, updates the 'comment_type' and 'comment_approved' properties of the prepared comment.
 *
 * @param array $prepared_comment The prepared comment data.
 * @param WP_REST_Request $request The REST API request object.
 * @return array The updated prepared comment data.
 */
if ( ! function_exists( 'update_comment_type_in_rest_api_6_8' ) ) {
	function update_comment_type_in_rest_api_6_8( $prepared_comment, $request ) {
		if ( ! empty( $request['comment_type'] ) && 'block_comment' === $request['comment_type'] ) {
			$prepared_comment['comment_type']     = $request['comment_type'];
			$prepared_comment['comment_approved'] = $request['comment_approved'];
		}

		return $prepared_comment;
	}
	add_filter( 'rest_pre_insert_comment', 'update_comment_type_in_rest_api_6_8', 10, 2 );
}

/**
 * Updates the comment type for avatars in the WordPress REST API.
 *
 * This function adds the 'block_comment' type to the list of comment types
 * for which avatars should be retrieved in the WordPress REST API.
 *
 * @param array $comment_type The array of comment types.
 * @return array The updated array of comment types.
 */
if ( ! function_exists( 'update_get_avatar_comment_type' ) ) {
	function update_get_avatar_comment_type( $comment_type ) {
		$comment_type[] = 'block_comment';
		return $comment_type;
	}
	add_filter( 'get_avatar_comment_types', 'update_get_avatar_comment_type' );
}

/**
 * Allows multiple comment statuses to be passed as an array in REST API requests.
 *
 * This function modifies the 'status' parameter in the comment collection params
 * to accept both string and array types, allowing queries like status=['hold','approved'].
 * 
 * TODO: Remove when https://github.com/WordPress/wordpress-develop/pull/9870 is merged.
 *
 * @param array $query_params The collection parameters.
 * @return array The updated collection parameters.
 */
if ( ! function_exists( 'gutenberg_filter_rest_comment_collection_params' ) ) {
	function gutenberg_filter_rest_comment_collection_params( $query_params ) {
		if ( isset( $query_params['status'] ) ) {
			$query_params['status']['type'] = array( 'string', 'array' );
		}
		return $query_params;
	}
	add_filter( 'rest_comment_collection_params', 'gutenberg_filter_rest_comment_collection_params' );
}

/**
 * Excludes block comments from the admin comments query.
 *
 * This function modifies the comments query to exclude comments of type 'block_comment'
 * when the query is for comments in the WordPress admin.
 *
 * @global wpdb $wpdb WordPress database abstraction object.
 *
 * @param WP_Comment_Query $query The current comments query.
 *
 * @return void
 */
if ( ! function_exists( 'exclude_block_comments_from_admin' ) ) {
	function exclude_block_comments_from_admin( $query ) {
		// Only modify the query if it's for comments
		if ( isset( $query->query_vars['type'] ) && '' === $query->query_vars['type'] ) {
			$query->set( 'type', '' );

			add_filter(
				'comments_clauses',
				function ( $clauses ) {
					global $wpdb;
					// Exclude comments of type 'block_comment'
					$clauses['where'] .= " AND {$wpdb->comments}.comment_type != 'block_comment'";
					return $clauses;
				}
			);
		}
	}
	add_action( 'pre_get_comments', 'exclude_block_comments_from_admin' );
}
