<?php
/**
 * Class file for the MinnPost_Membership_Shortcodes class.
 *
 * @file
 */

if ( ! class_exists( 'MinnPost_Membership' ) ) {
	die();
}

/**
 * Create default WordPress shortcodes functionality
 */
class MinnPost_Membership_Shortcodes {

	protected $option_prefix;
	protected $version;
	protected $slug;
	protected $member_levels;
	protected $user_info;
	protected $content_items;
	protected $cache;

	/**
	* Constructor which sets up shortcodes
	*
	* @param string $option_prefix
	* @param string $version
	* @param string $slug
	* @param object $member_levels
	* @param object $user_info
	* @param object $content_items
	* @param object $cache
	* @throws \Exception
	*/
	public function __construct( $option_prefix, $version, $slug, $member_levels, $user_info, $content_items, $cache ) {

		$this->option_prefix = $option_prefix;
		$this->version       = $version;
		$this->slug          = $slug;
		$this->member_levels = $member_levels;
		$this->user_info     = $user_info;
		$this->content_items = $content_items;
		$this->cache         = $cache;

		$this->mp_mem_transients = $this->cache->mp_mem_transients;

		$this->add_actions();

	}

	/**
	* Create the action hooks to create shortcodes
	*
	*/
	public function add_actions() {
		// shortcodes for pages
		add_shortcode( 'donations', array( $this, 'donations' ) ); // active/pending donations
		add_shortcode( 'donation-history', array( $this, 'donation_history' ) ); // donation history
		add_action( 'template_redirect', array( $this, 'manage_donations_require_login' ) ); // these shortcodes require users to be logged in
	}

	/**
	 * A shortcode for rendering the donations page
	 *
	 * @param  array   $attributes  Shortcode attributes.
	 * @param  string  $content     The text content for shortcode. Not used.
	 *
	 * @return string  The shortcode output
	 */
	public function donations( $attributes, $content = null ) {

		$attributes = shortcode_atts(
			array(),
			$attributes,
			'donations'
		);

		if ( ! is_array( $attributes ) ) {
			$attributes = array();
		}

		$message  = '';
		$messages = array();

		$user_id = get_current_user_id();
		if ( 0 !== $user_id ) {
			//query fields
			$active_field_name                  = get_option( $this->option_prefix . 'active_status_field', '' );
			$active_field_value                 = get_option( $this->option_prefix . 'active_status_value', '' );
			$recurrence_field_name              = get_option( $this->option_prefix . 'onetime_field', '' );
			$recurrence_field_value             = get_option( $this->option_prefix . 'onetime_value', '' );
			$contact_id_field_name              = get_option( $this->option_prefix . 'opp_contact_field', '' );
			$recurring_payment_type_field_name  = get_option( $this->option_prefix . 'recurring_payment_type_field', '' );
			$recurring_payment_type_field_value = get_option( $this->option_prefix . 'recurring_payment_type_value', '' );
			$opp_payment_type_field_name        = get_option( $this->option_prefix . 'opp_payment_type_field', '' );
			$opp_payment_type_field_value       = get_option( $this->option_prefix . 'opp_payment_type_value', '' );
			$opportunity_type_value             = get_option( $this->option_prefix . 'opportunity_type_value', '' );

			// urls for editing/cancelling
			$edit_recurring_url   = defined( 'RECURRING_DONATION_EDIT_URL' ) ? RECURRING_DONATION_EDIT_URL : get_option( $this->option_prefix . 'edit_recurring_link', '' );
			$cancel_recurring_url = defined( 'RECURRING_DONATION_CANCEL_URL' ) ? RECURRING_DONATION_CANCEL_URL : get_option( $this->option_prefix . 'cancel_recurring_link', '' );
			$edit_onetime_url     = defined( 'OPPORTUNITY_EDIT_URL' ) ? OPPORTUNITY_EDIT_URL : get_option( $this->option_prefix . 'edit_opportunity_link', '' );
			$cancel_onetime_url   = defined( 'OPPORTUNITY_CANCEL_URL' ) ? OPPORTUNITY_CANCEL_URL : get_option( $this->option_prefix . 'cancel_opportunity_link', '' );

			// failed donations are tied to the payment type, if it exists, as well as a timeframe and StageName value
			$opp_payment_type_field_name  = get_option( $this->option_prefix . 'opp_payment_type_field', '' );
			$opp_payment_type_field_value = get_option( $this->option_prefix . 'opp_payment_type_value', '' );
			$history_failed_value         = get_option( $this->option_prefix . 'history_failed_value', '' );
			$history_success_value        = get_option( $this->option_prefix . 'history_success_value', '' );
			$history_days_for_failed      = get_option( $this->option_prefix . 'history_days_for_failed', '' );

			// failed donations need to load the recurring donation id if they are not onetime only
			$recurrence_field_name     = get_option( $this->option_prefix . 'onetime_field', '' );
			$recurrence_field_value    = get_option( $this->option_prefix . 'onetime_value', '' );
			$failed_recurring_id_field = get_option( $this->option_prefix . 'failed_recurring_id_field', '' );

			// arrays of donations
			$active_recurring_donations = apply_filters(
				$this->option_prefix . 'get_active_recurring_donations',
				$user_id,
				$active_field_name,
				$active_field_value,
				$recurring_payment_type_field_name,
				$recurring_payment_type_field_value
			);
			$pledged_opportunities      = apply_filters(
				$this->option_prefix . 'get_pledged_opportunities',
				$user_id,
				$recurrence_field_name,
				$recurrence_field_value,
				$contact_id_field_name,
				$opp_payment_type_field_name,
				$opp_payment_type_field_value,
				$opportunity_type_value
			);
			// arrays of historical donations
			$failed_opportunities     = apply_filters(
				$this->option_prefix . 'get_failed_opportunities',
				$user_id,
				$contact_id_field_name,
				$opp_payment_type_field_name,
				$opp_payment_type_field_value,
				$history_failed_value,
				$history_days_for_failed,
				$recurrence_field_name,
				$recurrence_field_value,
				$failed_recurring_id_field,
				$opportunity_type_value
			);
			$successful_opportunities = apply_filters(
				$this->option_prefix . 'get_successful_opportunities',
				$user_id,
				$contact_id_field_name,
				$history_success_value,
				$opportunity_type_value
			);

			// merged, sorted array of donations
			$all_donations = array_merge( $active_recurring_donations, $pledged_opportunities );
			usort(
				$all_donations,
				function ( $item1, $item2 ) {
					return $item1['next_date'] <=> $item2['next_date'];
				}
			);

			if ( ! empty( $all_donations ) ) {
				foreach ( $all_donations as $donation ) {
					// this is a onetime donation; it has no frequency
					if ( ! isset( $donation['frequency'] ) ) {
						$donation['frequency'] = __( 'One-time', 'minnpost-membership' );
						$donation_type         = $donation['frequency'];
						$donation_date_heading = __( 'Transaction Date', 'minnpost-membership' );
						$donation_update_url   = str_replace( '$opportunity_id', $donation['id'], $edit_onetime_url );
						$donation_cancel_url   = str_replace( '$opportunity_id', $donation['id'], $cancel_onetime_url );
					} else {
						// this is a recurring donation
						$donation_type         = __( 'recurring', 'minnpost-membership' );
						$donation_date_heading = __( 'Next Transaction Date', 'minnpost-membership' );
						$donation_update_url   = str_replace( '$recurring_donation_id', $donation['id'], $edit_recurring_url );
						$donation_cancel_url   = str_replace( '$recurring_donation_id', $donation['id'], $cancel_recurring_url );
					}

					$donation_type_heading   = sprintf(
						'Your %1$s Donation',
						ucfirst( $donation_type )
					);
					$modify_donation_heading = __( 'Modify Your Donation', 'minnpost-membership' );
					$update_payment_button   = __( 'Update Payment Method', 'minnpost-membership' );
					$change_amount_button    = __( 'Change Amount', 'minnpost-membership' );
					$stop_button             = __( 'Stop Donation', 'minnpost-membership' );
					$caption_review          = __( 'You will be able to review and confirm these actions in the final step.', 'minnpost-membership' );

					$messages[] = '
						<section class="m-donation m-donation-' . $donation_type . '">
							<h4 class="a-donation-heading a-your-donation">' . $donation_type_heading . '</h4>
							<h2 class="a-donation-amount">$' . $donation['amount'] . '</h2>
							<h3 class="a-donation-frequency">' . strtolower( $donation['frequency'] ) . '</h3>
						</section>
						<section class="m-next-donation">
							<h4 class="a-donation-heading a-next-transaction">' . $donation_date_heading . '</h4>
							<div class="a-next-transaction-date">' . date_i18n( 'F j, Y', strtotime( $donation['next_date'] ) ) . '</div>
						</section>
						<section class="m-donation-actions">
							<h4 class="a-donation-heading a-modify-donation">' . $modify_donation_heading . '</h4>
							<a href="' . $donation_update_url . '" class="a-button a-button-update-payment">' . $update_payment_button . '</a>
							<div class="a-donation-actions a-button-sentence">
								<a href="' . $donation_update_url . '" class="a-button a-button-secondary">' . $change_amount_button . '</a>
								<a href="' . $donation_cancel_url . '" class="a-button a-button-secondary">' . $stop_button . '</a>
							</div>
							<small class="a-form-caption">' . $caption_review . '</small>
						</section>
						';
				}
			} else {
				$nonmember_level_name = get_option( 'salesforce_api_nonmember_level_name', 'Non-member' );
				$member_level_name    = apply_filters( $this->option_prefix . 'get_member_level', $user_id );
			}
		}

		if ( ! empty( $messages ) ) {
			foreach ( $messages as $donation_message ) {
				$message .= '<article class="m-donation-message">' . $donation_message . '</article>';
			}
		} elseif ( empty( $successful_opportunities ) || ( '' !== $member_level_name && $member_level_name === $nonmember_level_name ) ) {
			// show this if there are no successful donations ever, OR if the user is a lapsed member
			$message = '<article class="m-no-donation-message">' . wp_kses_post( wpautop( get_option( $this->option_prefix . 'no_donation_message', '' ) ) ) . '</article>';
		}

		$donation_history_link = get_option( $this->option_prefix . 'donation_history_message', '' );
		if ( '' !== $donation_history_link ) {

			if ( ! empty( $failed_opportunities ) || ! empty( $successful_opportunities ) ) {
				$message .= '<h2 class="a-donation-history-heading">' . wp_kses_post( $donation_history_link ) . '</h2>';
			}
		}

		return $message;
	}

	/**
	 * A shortcode for rendering the donation history page
	 *
	 * @param  array   $attributes  Shortcode attributes.
	 * @param  string  $content     The text content for shortcode. Not used.
	 *
	 * @return string  The shortcode output
	 */
	public function donation_history( $attributes, $content = null ) {

		$attributes = shortcode_atts(
			array(),
			$attributes,
			'donations'
		);

		if ( ! is_array( $attributes ) ) {
			$attributes = array();
		}

		$history = '';

		$user_id = get_current_user_id();
		if ( 0 !== $user_id ) {
			// past donations are tied to the contact
			$contact_id_field_name = get_option( $this->option_prefix . 'opp_contact_field', '' );

			// failed donations are tied to the payment type, if it exists, as well as a timeframe and StageName value
			$opportunity_type_value       = get_option( $this->option_prefix . 'opportunity_type_value', '' );
			$opp_payment_type_field_name  = get_option( $this->option_prefix . 'opp_payment_type_field', '' );
			$opp_payment_type_field_value = get_option( $this->option_prefix . 'opp_payment_type_value', '' );
			$history_failed_value         = get_option( $this->option_prefix . 'history_failed_value', '' );
			$history_success_value        = get_option( $this->option_prefix . 'history_success_value', '' );
			$history_days_for_failed      = get_option( $this->option_prefix . 'history_days_for_failed', '' );

			// failed donations need to load the recurring donation id if they are not onetime only
			$recurrence_field_name     = get_option( $this->option_prefix . 'onetime_field', '' );
			$recurrence_field_value    = get_option( $this->option_prefix . 'onetime_value', '' );
			$failed_recurring_id_field = get_option( $this->option_prefix . 'failed_recurring_id_field', '' );

			// url for resubmitting
			$edit_recurring_url = defined( 'RECURRING_DONATION_EDIT_URL' ) ? RECURRING_DONATION_EDIT_URL : get_option( $this->option_prefix . 'edit_recurring_link', '' );
			$edit_onetime_url   = defined( 'OPPORTUNITY_EDIT_URL' ) ? OPPORTUNITY_EDIT_URL : get_option( $this->option_prefix . 'edit_opportunity_link', '' );

			// arrays of donations
			$failed_opportunities = apply_filters(
				$this->option_prefix . 'get_failed_opportunities',
				$user_id,
				$contact_id_field_name,
				$opp_payment_type_field_name,
				$opp_payment_type_field_value,
				$history_failed_value,
				$history_days_for_failed,
				$recurrence_field_name,
				$recurrence_field_value,
				$failed_recurring_id_field,
				$opportunity_type_value
			);

			$successful_opportunities = apply_filters(
				$this->option_prefix . 'get_successful_opportunities',
				$user_id,
				$contact_id_field_name,
				$history_success_value,
				$opportunity_type_value
			);

			usort(
				$failed_opportunities,
				function ( $item1, $item2 ) {
					return $item2['close_date'] <=> $item1['close_date'];
				}
			);

			usort(
				$successful_opportunities,
				function ( $item1, $item2 ) {
					return $item2['close_date'] <=> $item1['close_date'];
				}
			);

			$history = '';

			if ( ! empty( $failed_opportunities ) ) {
				$failed_heading    = get_option( $this->option_prefix . 'history_failed_heading', '' );
				$failed_message    = get_option( $this->option_prefix . 'history_failed_message', '' );
				$amount_heading    = __( 'Amount', 'minnpost-membership' );
				$attempted_heading = __( 'Attempted Date', 'minnpost-membership' );
				$retry_button      = __( 'Edit and retry', 'minnpost-membership' );
				if ( '' !== $failed_message ) {
					$failed_message = wp_kses_post( wpautop( $failed_message ) );
				}
				$history .= '<section class="m-donation-history"><h2>' . $failed_heading . '</h2>' . $failed_message . '<table><thead><th>' . $amount_heading . '</th><th>' . $attempted_heading . '</th><th>
				&nbsp;</th></thead>';
				// this is where the list starts
				foreach ( $failed_opportunities as $donation ) {
					// this is a onetime donation; it has no frequency
					if ( ! isset( $donation['frequency'] ) ) {
						$donation_update_url = str_replace( '$opportunity_id', $donation['id'], $edit_onetime_url );
						$donation_cancel_url = str_replace( '$opportunity_id', $donation['id'], $cancel_onetime_url );
					} else {
						// this is a recurring donation
						$donation_update_url = str_replace( '$recurring_donation_id', $donation['id'], $edit_recurring_url );
					}
					$history .= '<tr><td>$' . $donation['amount'] . ' ' . strtolower( $donation['frequency'] ) . '</td><td>' . date_i18n( 'F j, Y', strtotime( $donation['close_date'] ) ) . '</td><td><a href="' . $donation_update_url . '" class="a-button">' . $retry_button . '</a></td></tr>';
				}
				$history .= '</table></section>';
			}

			if ( ! empty( $successful_opportunities ) ) {
				$succeeded_heading = get_option( $this->option_prefix . 'history_success_heading', '' );
				$succeeded_message = get_option( $this->option_prefix . 'history_success_message', '' );
				$amount_heading    = __( 'Amount', 'minnpost-membership' );
				$charged_heading   = __( 'Charged Date', 'minnpost-membership' );
				if ( '' !== $succeeded_message ) {
					$succeeded_message = wp_kses_post( wpautop( $succeeded_message ) );
				}
				$history .= '<section class="m-donation-history"><h2>' . $succeeded_heading . '</h2>' . $succeeded_message . '<table><thead><th>' . $amount_heading . '</th><th colspan-"2">' . $charged_heading . '</th><th>
				&nbsp;</th></thead>';
				// this is where the list starts
				foreach ( $successful_opportunities as $donation ) {
					$frequency = isset( $donation['frequency'] ) ? strtolower( $donation['frequency'] ) : '';
					$history  .= '<tr><td>$' . $donation['amount'] . ' ' . $frequency . '</td><td colspan="2">' . date_i18n( 'F j, Y', strtotime( $donation['close_date'] ) ) . '</td></tr>';
				}
				$history .= '</table></section>';
			}
		}

		if ( ! empty( $history ) ) {
				$message = '<article class="m-donation-history">' . $history . '</article>';
		} else {
			$message = '<article class="m-no-donation-history">' . wp_kses_post( wpautop( get_option( $this->option_prefix . 'no_donation_message', '' ) ) ) . '</article>';
		}

		return $message;

	}

	/**
	* Redirect users who are not logged in if they encounter manage donation shortcodes
	*
	*/
	public function manage_donations_require_login() {
		// if we're not on a singular, it doesn't matter
		if ( ! is_singular() ) {
			return;
		}
		// if a user is logged in, go ahead and let it continue
		$user_id = get_current_user_id();
		if ( 0 !== $user_id ) {
			return;
		}
		global $post;
		if ( ! empty( $post->post_content ) ) {
			$regex = get_shortcode_regex();
			preg_match_all( '/' . $regex . '/', $post->post_content, $matches );
			// is there a shortcode?
			if ( ! empty( $matches[2] ) ) {
				// does the shortcode match either of these donation managing shortcodes?
				if ( ! empty( array_intersect( array( 'donations', 'donation-history' ), $matches[2] ) ) ) {
					global $wp;
					$current_slug = add_query_arg( array(), $wp->request );
					wp_redirect( site_url( '/user/login/?destination=/' . $current_slug ) );
				} else {
					return;
				}
			} else {
				return;
			}
		} else {
			return;
		}
	}

}
