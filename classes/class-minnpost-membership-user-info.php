<?php
/**
 * Class file for the MinnPost_Membership_User_Info class.
 *
 * @file
 */

if ( ! class_exists( 'MinnPost_Membership' ) ) {
	die();
}

/**
 * Create default WordPress admin functionality to configure the plugin.
 */
class MinnPost_Membership_User_Info {

	protected $option_prefix;
	protected $version;
	protected $slug;
	protected $member_levels;
	protected $cache;

	/**
	* Constructor which sets up user information related to membership
	*
	* @param string $option_prefix
	* @param string $version
	* @param string $slug
	* @param array $member_levels
	* @param object $cache
	* @throws \Exception
	*/
	public function __construct( $option_prefix, $version, $slug, $member_levels, $cache ) {

		$this->option_prefix = $option_prefix;
		$this->version       = $version;
		$this->slug          = $slug;
		$this->member_levels = $member_levels;
		$this->cache         = $cache;

		$this->mp_mem_transients = $this->cache->mp_mem_transients;

		// include the non member level for this purpose
		$this->all_member_levels = $this->member_levels->get_member_levels( '', true );

		$this->add_actions();

	}

	/**
	* Create the action hooks to create the admin page(s)
	*
	*/
	private function add_actions() {
		if ( ! is_admin() ) {

		}

	}

	/**
	* Store the user's membership info to be passed around
	*
	* @param int $user_id
	* @return array $user_info
	*
	*/
	public function user_membership_info( $user_id = 0 ) {

		$user_membership_info = array();
		if ( 0 === $user_id ) {
			return $user_membership_info;
		}

		$user_info = get_userdata( $user_id );

		$user_membership_info['member_level'] = $this->user_member_level( $user_id )['slug'];
		/*
		$page_amount = variable_get('minnpost_support_page_form_start', 1) * $defaultfrequency;
		$prior_year_amount = $account['prior_year_contributions'];
		$coming_year_amount = $account['coming_year_contributions'];
		$annual_recurring_amount = $account['annual_recurring_amount'];
		*/

		$user_membership_info['prior_year_contributions']  = isset( $user_info->_prior_year_contributions ) ? $user_info->_prior_year_contributions : 0;
		$user_membership_info['annual_recurring_amount']   = isset( $user_info->_annual_recurring_amount ) ? $user_info->_annual_recurring_amount : 0;
		$user_membership_info['coming_year_contributions'] = isset( $user_info->_coming_year_contributions ) ? $user_info->_coming_year_contributions : 0;
		return $user_membership_info;
	}

	/**
	* Store the user's member level info
	*
	* @param int $user_id
	* @return array $user_member_level
	*
	*/
	public function user_member_level( $user_id = 0 ) {

		$user_member_level = array(
			'is_nonmember' => true,
		);

		// if the user id is not a user, they are not a member
		if ( 0 === $user_id ) {
			return $user_member_level;
		}

		$user_info  = get_userdata( $user_id );
		$user_roles = $user_info->roles;

		if ( is_array( $user_roles ) && ! empty( $user_roles ) ) {
			$highest_user_role_name = $user_roles[ max( array_keys( $user_roles ) ) ];
			$highest_user_role_key  = array_search( $highest_user_role_name, array_column( $this->all_member_levels, 'slug' ) );
			$user_member_level      = $this->all_member_levels[ $highest_user_role_key ];
		}

		return $user_member_level;
	}

}
