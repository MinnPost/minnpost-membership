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

	public $change_for_members;

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

		$this->change_for_members = get_option( $this->option_prefix . 'support_post_form_change_for_members', false );

		$this->mp_mem_transients = $this->cache->mp_mem_transients;

		$this->post_access_meta_key = get_option( $this->option_prefix . 'post_access_meta_key', '' );
		$this->option_levels_key    = 'eligible_levels';

		$can_see_blocked_content       = array( 'administrator', 'editor', 'business' );
		$this->can_see_blocked_content = apply_filters( 'minnpost_membership_can_see_blocked_content', $can_see_blocked_content );

		// eligibility possibilities. we can hardcode these.
		$this->eligibility_states = $this->get_eligibility_states();
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
	* Create the states of eligibility a user can have
	*
	*/
	public function get_eligibility_states() {

		$eligibility_states = array(
			'not_logged_in'        => __( 'Not logged in', 'minnpost-membership' ),
			'logged_in_non_member' => __( 'Logged in non-member', 'minnpost-membership' ),
			'member_ineligible'    => __( 'Member not eligible', 'minnpost-membership' ),
			'member_eligible'      => __( 'Member eligible', 'minnpost-membership' ),
		);

		return $eligibility_states;
	}

	/**
	* Get the current state of this user for this content
	*
	*/
	public function get_user_state( $user_id = '', $url = '' ) {

		if ( '' === $user_id ) {
			$user_id = get_current_user_id();
		}

		if ( 0 === $user_id ) {
			$user_state = 'not_logged_in';
			return $user_state;
		} elseif ( '' === $url ) {
			$post_id       = get_the_ID();
			$post_meta_key = $this->post_access_meta_key;
			$can_access    = $this->user_can_access( $user_id, $post_id, $post_meta_key );
		} else {
			$can_access = $this->user_can_access( $user_id, '', '', $url );
		}

		if ( true === $can_access ) {
			$user_state = 'member_eligible';
		} else {
			$user_member_level = $this->user_member_level( $user_id );
			if ( true === filter_var( $user_member_level['is_nonmember'], FILTER_VALIDATE_BOOLEAN ) ) {
				$user_state = 'logged_in_non_member';
			} else {
				$user_state = 'member_ineligible';
			}
		}

		return $user_state;
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

		// i do not think these are the ideal fields, but for now we'll keep them
		$user_membership_info['previous_amount'] = array(
			'prior_year_contributions'  => isset( $user_info->_prior_year_contributions ) ? $user_info->_prior_year_contributions : 0,
			'annual_recurring_amount'   => isset( $user_info->_annual_recurring_amount ) ? $user_info->_annual_recurring_amount : 0,
			'coming_year_contributions' => isset( $user_info->_coming_year_contributions ) ? $user_info->_coming_year_contributions : 0,
		);

		// i think ideally we should be passing just one value here, which we can then modify based on what is happening on the page to calculate stuff.

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

		// by default, we should assume the user is a non member
		$highest_user_role_key = array_search( '1', array_column( $this->all_member_levels, 'is_nonmember' ) );
		$user_member_level     = $this->all_member_levels[ $highest_user_role_key ];

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

	/**
	* Get the new amount for the given user, based on their past info and what is currently on the page
	*
	* @param int $user_id
	* @param int $on_page_amount
	* @param array $on_page_frequency
	* @return int $new_amount_this_year
	*
	*/
	public function get_user_new_amount( $user_id = 0, $on_page_amount, $on_page_frequency ) {

		// deal with on-page info
		$frequency_values     = $this->member_levels->get_frequency_values( $on_page_frequency['value'] );
		$new_amount_this_year = $on_page_amount * $frequency_values['times_per_year'];

		// if there is no logged in user, or if the settings say to ignore user's member data, go ahead and return this amount
		if ( 0 === $user_id || '1' !== $this->change_for_members ) {
			return $new_amount_this_year;
		}

		// get member info based on salesforce
		// i do not think these are the ideal fields, but for now we'll keep them
		$user_member_info        = $this->user_membership_info( $user_id );
		$previous_amount         = $user_member_info['previous_amount'];
		$prior_year_amount       = $previous_amount['prior_year_contributions'];
		$coming_year_amount      = $previous_amount['coming_year_contributions'];
		$annual_recurring_amount = $previous_amount['annual_recurring_amount'];

		// use formula for calculating membership level here
		if ( 'one-time' === $on_page_frequency['id'] ) {
			$prior_year_amount = $prior_year_amount + $on_page_amount;
		} else {
			$annual_recurring_amount = $annual_recurring_amount + $on_page_amount;
		}

		$new_amount_this_year = max( $prior_year_amount, $coming_year_amount, $annual_recurring_amount );

		return $new_amount_this_year;
	}

	/**
	* Determine whether a user can access a post, based on the user ID and a post id and meta key, or url, that can access this content
	*
	* @param int $user_id
	* @param int $post_id
	* @param string $post_meta_key
	* @param string $url
	*
	* @return bool $can_access
	*/
	public function user_can_access( $user_id = '', $post_id = '', $post_meta_key = '', $url = '' ) {

		if ( '' === $user_id ) {
			$user_id = get_current_user_id();
		}

		if ( '' === $url ) {
			if ( '' === $post_id ) {
				$post_id = get_the_ID();
			}
			$content_access_level = get_post_meta( $post_id, $post_meta_key, true );
		} else {
			// get all the levels from the option value
			$content_access_levels = get_option( $this->option_prefix . $url . '_' . $this->option_levels_key, array() );
			// get the minimum level required for this content
			$content_access_level = $content_access_levels[ min( array_keys( $content_access_levels ) ) ];
		}

		if ( '' === $content_access_level ) {
			return true;
		}

		// at this point, the default access answer should be false because the single item has a level meta value. user roles override it.
		$can_access = false;

		// if the user id is not a user, they can't access any restricted content
		if ( 0 === $user_id ) {
			return $can_access;
		}

		// if the content access level is only registered, let the user in because they are signed in
		if ( 'registered' === $content_access_level ) {
			return true;
		}

		// get the text value of the content access level
		if ( false === filter_var( $content_access_level, FILTER_VALIDATE_INT ) ) {
			$key = array_search( $content_access_level, array_column( $this->all_member_levels, 'slug' ) );
		} else {
			$key = $content_access_level;
		}

		// if we have a slug here, it is the lowest level required for this content
		if ( isset( $content_access_level['slug'] ) ) {
			$content_access_level = $this->all_member_levels[ $key ]['slug'];
		}

		// if we have a slug here, it is the user's member level
		$user_member_level = $this->user_member_level( $user_id );
		if ( isset( $user_member_level['slug'] ) ) {
			$user_member_level = $user_member_level['slug'];
		} else {
			return $can_access;
		}

		if ( $user_member_level === $content_access_level ) {
			$can_access = true;
		}

		if ( true === $can_access ) {
			return $can_access;
		}

		// if user has a role that allows them to see everything, let them see everything
		/*$user_info      = get_userdata( $user_id );
		$all_user_roles = $user_info->roles;

		$can_user_see_everything = array_intersect( $this->can_see_blocked_content, $all_user_roles );
		if ( is_array( $can_user_see_everything ) && ! empty( $can_user_see_everything ) ) {
			$can_access = true;
		}*/

		return $can_access;
	}

}
