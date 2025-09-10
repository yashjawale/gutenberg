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

/**
 * Registers comment meta fields for block comments in the REST API.
 *
 * This function registers the '_resolution_history' meta field for comments
 * so it can be read and written via the WordPress REST API.
 *
 * @return void
 */
if ( ! function_exists( 'register_block_comment_meta_fields' ) ) {
	function register_block_comment_meta_fields() {
		register_meta(
			'comment',
			'_resolution_history',
			array(
				'type'          => 'array',
				'description'   => 'Resolution history for block comments',
				'single'        => true,
				'show_in_rest'  => array(
					'schema' => array(
						'type'  => 'array',
						'items' => array(
							'type'       => 'object',
							'properties' => array(
								'action'    => array(
									'type' => 'string',
									'enum' => array( 'resolve', 'reopen' ),
								),
								'timestamp' => array(
									'type'   => 'string',
									'format' => 'date-time',
								),
								'userId'    => array(
									'type' => 'integer',
								),
							),
						),
					),
				),
				'auth_callback' => function () {
					return current_user_can( 'edit_posts' );
				},
			)
		);
	}
	add_action( 'rest_api_init', 'register_block_comment_meta_fields' );
}
