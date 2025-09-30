<?php
/**
 * Unit tests covering block comments functionality.
 *
 * @package gutenberg
 */

/**
 * Unit tests for the gutenberg_allow_empty_block_comments function.
 *
 * @covers gutenberg_allow_empty_block_comments
 */
class Gutenberg_Allow_Empty_Block_Comments_Test extends WP_UnitTestCase {

	/**
	 * Tests that the filter is properly added for the function.
	 */
	public function test_filter_is_added() {
		$this->assertTrue( has_filter( 'allow_empty_comment' ) );
		$this->assertEquals( 10, has_filter( 'allow_empty_comment', 'gutenberg_allow_empty_block_comments' ) );
	}

	/**
	 * Data provider for comment types that should allow empty comments.
	 *
	 * @return array
	 */
	public function data_provider_resolution_comment_types() {
		return array(
			'reopen comment type' => array( 'block_comment_ropen' ),
			'resolution comment type' => array( 'block_comment_resol' ),
		);
	}

	/**
	 * Tests that empty comments are allowed for resolution comment types.
	 *
	 * @dataProvider data_provider_resolution_comment_types
	 *
	 * @param string $comment_type The comment type to test.
	 */
	public function test_allows_empty_comment_for_resolution_types( $comment_type ) {
		$prepared_comment = array(
			'comment_type' => $comment_type,
		);

		$result = gutenberg_allow_empty_block_comments( false, $prepared_comment );

		$this->assertTrue( $result );
	}

	/**
	 * Data provider for comment types that should not allow empty comments.
	 *
	 * @return array
	 */
	public function data_provider_non_resolution_comment_types() {
		return array(
			'empty comment type' => array( '' ),
			'default comment type' => array( 'comment' ),
			'block comment type' => array( 'block_comment' ),
			'trackback type' => array( 'trackback' ),
			'pingback type' => array( 'pingback' ),
			'custom type' => array( 'some_custom_type' ),
		);
	}

	/**
	 * Tests that empty comments are not allowed for non-resolution comment types.
	 *
	 * @dataProvider data_provider_non_resolution_comment_types
	 *
	 * @param string $comment_type The comment type to test.
	 */
	public function test_does_not_allow_empty_comment_for_non_resolution_types( $comment_type ) {
		$prepared_comment = array(
			'comment_type' => $comment_type,
		);

		$result = gutenberg_allow_empty_block_comments( false, $prepared_comment );

		$this->assertFalse( $result, "Empty comments should not be allowed for comment type: {$comment_type}" );
	}

	/**
	 * Data provider for testing preservation of original true values.
	 *
	 * @return array
	 */
	public function data_provider_preserve_true_value_scenarios() {
		return array(
			'resolution comment type' => array( 'block_comment_ropen' ),
			'reopen comment type' => array( 'block_comment_resol' ),
			'regular comment type' => array( 'regular_comment' ),
		);
	}

	/**
	 * Tests that the function preserves the original allow value when true.
	 *
	 * @dataProvider data_provider_preserve_true_value_scenarios
	 *
	 * @param string $comment_type The comment type to test.
	 */
	public function test_preserves_original_true_value( $comment_type ) {
		$prepared_comment = array(
			'comment_type' => $comment_type,
		);

		$result = gutenberg_allow_empty_block_comments( true, $prepared_comment );

		$this->assertTrue( $result );
	}

	/**
	 * Tests behavior with missing comment_type key.
	 */
	public function test_handles_missing_comment_type() {
		$prepared_comment = array();

		$result = gutenberg_allow_empty_block_comments( false, $prepared_comment );

		$this->assertFalse( $result );
	}
}
