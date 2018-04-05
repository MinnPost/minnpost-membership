<?php
/**
 * Class file for the MinnPost_Membership_Member_Level class.
 *
 * @file
 */

if ( ! class_exists( 'MinnPost_Membership' ) ) {
	die();
}

/**
 * Member levels
 */
class MinnPost_Membership_Member_Level {

	protected $option_prefix;
	protected $version;
	protected $slug;
	protected $cache;

	/**
	* Constructor which sets up member levels
	*
	* @param string $option_prefix
	* @param string $version
	* @param string $slug
	* @param object $cache
	* @throws \Exception
	*/
	public function __construct( $option_prefix, $version, $slug, $cache ) {

		$this->option_prefix = $option_prefix;
		$this->version       = $version;
		$this->slug          = $slug;
		$this->cache         = $cache;

		$this->add_actions();

	}

	/**
	* Do actions
	*
	*/
	private function add_actions() {

	}

	/**
	* Get all, or one, of the member levels
	*
	* @param  int   $id
	* @return array $member_levels
	*
	*/
	public function get_member_levels( $id = '' ) {
		$member_levels = get_option( $this->option_prefix . 'member_levels', array() );
		if ( '' !== $id ) {
			return $member_levels[ $id ];
		}
		return $member_levels;
	}

	/**
	* Create a member level
	*
	* @param array $post_data
	* @return bool $result
	*
	*/
	public function create_member_level( $post_data ) {
		$member_levels   = get_option( $this->option_prefix . 'member_levels', array() );
		$data            = $this->setup_member_level_data( $post_data );
		$member_levels[] = $data;
		usort( $member_levels, function( $a, $b ) {
			return intval( $b['minimum_monthly_amount'] ) - intval( $a['minimum_monthly_amount'] );
		});
		$result = update_option( $this->option_prefix . 'member_levels', $member_levels );
		if ( true === $result ) {
			return true;
		} else {
			return false;
		}
	}

	/**
	* Update a member level
	*
	* @param array $post_data
	* @param int   $id
	* @return bool $result
	*
	*/
	public function update_member_level( $post_data, $id ) {
		$member_levels        = get_option( $this->option_prefix . 'member_levels', array() );
		$data                 = $this->setup_member_level_data( $post_data );
		$member_levels[ $id ] = $data;
		usort( $member_levels, function( $a, $b ) {
			return intval( $b['minimum_monthly_amount'] ) - intval( $a['minimum_monthly_amount'] );
		});
		$result = update_option( $this->option_prefix . 'member_levels', $member_levels );
		if ( true === $result ) {
			return true;
		} else {
			return false;
		}
	}

	/**
	* Delete a member level
	*
	* @param int   $id
	* @return bool $result
	*
	*/
	public function delete_member_level( $id ) {
		$member_levels = get_option( $this->option_prefix . 'member_levels', array() );
		unset( $member_levels[ $id ] );
		usort( $member_levels, function( $a, $b ) {
			return intval( $b['minimum_monthly_amount'] ) - intval( $a['minimum_monthly_amount'] );
		});
		$result = update_option( $this->option_prefix . 'member_levels', $member_levels );
		if ( true === $result ) {
			return true;
		} else {
			return false;
		}
	}

	/**
	* Setup for member level data
	*
	* @param array $post_data
	* @return array $data
	*
	*/
	private function setup_member_level_data( $data ) {
		if ( ! isset( $data['is_nonmember'] ) || 1 !== intval( $data['is_nonmember'] ) ) {
			$prefix = 'member_';
		} else {
			$prefix = '';
		}
		$data = array(
			'slug'                   => $prefix . sanitize_title( $data['name'] ),
			'name'                   => sanitize_text_field( $data['name'] ),
			'is_nonmember'           => isset( $data['is_nonmember'] ) ? esc_attr( $data['is_nonmember'] ) : 0,
			'minimum_monthly_amount' => ( isset( $data['minimum_monthly_amount'] ) && '' !== $data['minimum_monthly_amount'] ) ? intval( $data['minimum_monthly_amount'] ) : 1,
			'maximum_monthly_amount' => ( isset( $data['maximum_monthly_amount'] ) && '' !== $data['maximum_monthly_amount'] ) ? intval( $data['maximum_monthly_amount'] ) : '',
			'starting_value'         => ( isset( $data['starting_value'] ) && '' !== $data['starting_value'] ) ? intval( $data['starting_value'] ) : 0,
			'benefits'               => sanitize_textarea_field( $data['benefits'] ),
		);
		return $data;
	}

}
