<?php
/**
 * Class file for the MinnPost_Membership_Shortcodes class.
 *
 * @file
 */

if ( ! class_exists( 'MinnPost_Membership' ) ) {
	die();
}

use Brain\Cortex\Route\RouteCollectionInterface;
use Brain\Cortex\Route\QueryRoute;

/**
 * Create default WordPress front end functionality
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
	* Constructor which sets up front end
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

			// urls for editing/cancelling
			$edit_recurring_url   = defined( 'RECURRING_DONATION_EDIT_URL' ) ? RECURRING_DONATION_EDIT_URL : get_option( $this->option_prefix . 'edit_recurring_link', '' );
			$cancel_recurring_url = defined( 'RECURRING_DONATION_CANCEL_URL' ) ? RECURRING_DONATION_CANCEL_URL : get_option( $this->option_prefix . 'cancel_recurring_link', '' );
			$edit_onetime_url     = defined( 'OPPORTUNITY_EDIT_URL' ) ? OPPORTUNITY_EDIT_URL : get_option( $this->option_prefix . 'edit_opportunity_link', '' );
			$cancel_onetime_url   = defined( 'OPPORTUNITY_CANCEL_URL' ) ? OPPORTUNITY_CANCEL_URL : get_option( $this->option_prefix . 'cancel_opportunity_link', '' );
			
			// arrays of donations
			$active_recurring_donations = apply_filters( $this->option_prefix . 'get_active_recurring_donations', $user_id, $active_field_name, $active_field_value, $recurring_payment_type_field_name, $recurring_payment_type_field_value );
			$pledged_opportunities      = apply_filters( $this->option_prefix . 'get_pledged_opportunities', $user_id, $recurrence_field_name, $recurrence_field_value, $contact_id_field_name, $opp_payment_type_field_name, $opp_payment_type_field_value );

			// merged, sorted array of donations
			$all_donations = array_merge( $active_recurring_donations, $pledged_opportunities );
			usort( $all_donations, function ( $item1, $item2 ) {
				return $item1['next_date'] <=> $item2['next_date'];
			});

			//$message = '<table><thead><th>Amount</th><th>Next Date</th><th colspan="2">Modify</th></thead>';
			if ( ! empty( $all_donations ) ) {
				foreach ( $all_donations as $donation ) {
					// this is a onetime donation; it has no frequency
					if ( ! isset( $donation['frequency'] ) ) {
						$donation['frequency'] = __( 'One-time', 'minnpost-membership' );
						$donation_type         = $donation['frequency'];
						$donation_date_heading = __( 'Transaction Date', 'minnpost-membership' );
						$donation_update_url      = str_replace( '$opportunity_id', $donation['id'], $edit_onetime_url );
						$donation_cancel_url    = str_replace( '$opportunity_id', $donation['id'], $cancel_onetime_url );
					} else {
						// this is a recurring donation
						$donation_type = __( 'recurring', 'minnpost-membership' );
						$donation_date_heading = __( 'Next Transaction Date', 'minnpost-membership' );
						$donation_update_url      = str_replace( '$recurring_donation_id', $donation['id'], $edit_recurring_url );
						$donation_cancel_url    = str_replace( '$recurring_donation_id', $donation['id'], $cancel_recurring_url );
					}

					$donation_type_heading   = sprintf( 'Your %1$s Donation',
						ucfirst( $donation_type )
					);
					$modify_donation_heading = __( 'Modify Your Donation', 'minnpost-membership' );
					$update_payment_button   = __( 'Update Payment Method', 'minnpost-membership' );
					$change_amount_button    = __( 'Change Amount', 'minnpost-membership' );
					$stop_button             = __( 'Stop', 'minnpost-membership' );
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
							<h4 class="a-donation-heading a-modify-donation">' . $modify_donation_heading. '</h4>
							<a href="' . $donation_update_url . '" class="a-button a-button-update-payment">' . $update_payment_button . '</a>
							<div class="a-donation-actions a-button-sentence">
								<a href="' . $donation_update_url . '" class="a-button a-button-secondary">' . $change_amount_button . '</a>
								<a href="' . $donation_cancel_url . '" class="a-button a-button-secondary">' . $stop_button . '</a>
							</div>
							<small class="a-form-caption">' . $caption_review . '</small>
						</section>
						';
					//$message .= '<tr><td>$' . $donation['amount'] . ' ' . strtolower( $donation['frequency'] ) . '</td><td>' . date_i18n( 'F j, Y', strtotime( $donation['next_date'] ) ) . '</td><td><a href="#">Edit</a> | <a href="#">Cancel</a></td></tr>';
				}
			}
		}

		if ( ! empty( $messages ) ) {
			foreach ( $messages as $donation_message ) {
				$message .= '<article class="m-donation-message">' . $donation_message . '</article>';
			}
		} else {
			$message = '<article class="m-no-donation-message">' . wp_kses_post( get_option( $this->option_prefix . 'no_donation_message', '' ) ) . '</article>';
		}

		$donation_history_link = get_option( $this->option_prefix . 'donation_history_message', '' );
		if ( '' !== $donation_history_link ) {
			$previous_opportunities = apply_filters( $this->option_prefix . 'get_previous_opportunities', $user_id, $recurrence_field_name, $recurrence_field_value, $contact_id_field_name, $opp_payment_type_field_name, $opp_payment_type_field_value );
			if ( ! empty( $previous_opportunities ) ) {
				$message               .= '<h2 class="a-donation-history-heading">' . wp_kses_post( $donation_history_link ) . '</h2>';
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

		$history  = '';

		$user_id = get_current_user_id();
		if ( 0 !== $user_id ) {
			$previous_opportunities = apply_filters( $this->option_prefix . 'get_previous_opportunities', $user_id, $recurrence_field_name, $recurrence_field_value, $contact_id_field_name, $opp_payment_type_field_name, $opp_payment_type_field_value );
			if ( ! empty( $previous_opportunities ) ) {
				// this is where the list starts
			}
		}

		if ( ! empty( $history ) ) {
				$message .= '<article class="m-donation-history">' . $history . '</article>';
		} else {
			$message = '<article class="m-no-donation-history">' . wp_kses_post( get_option( $this->option_prefix . 'no_donation_history', '' ) ) . '</article>';
		}

		return $message;

	}

}
