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
			$active_field_name          = get_option( $this->option_prefix . 'active_status_field', '' );
			$active_field_value          = get_option( $this->option_prefix . 'active_status_value', '' );
			$active_recurring_donations = apply_filters( $this->option_prefix . 'get_active_recurring_donations', $user_id, $active_field_name, $active_field_value );
			//$message = '<table><thead><th>Amount</th><th>Next Date</th><th colspan="2">Modify</th></thead>';
			foreach ( $active_recurring_donations as $donation ) {
				$edit_url      = defined( 'RECURRING_DONATION_EDIT_URL' ) ? RECURRING_DONATION_EDIT_URL : get_option( $this->option_prefix . 'edit_recurring_link', '' );
				$edit_url      = str_replace( '$recurring_donation_id', $donation['id'], $edit_url );
				$cancel_url    = defined( 'RECURRING_DONATION_CANCEL_URL' ) ? RECURRING_DONATION_CANCEL_URL : get_option( $this->option_prefix . 'cancel_recurring_link', '' );
				$cancel_url    = str_replace( '$recurring_donation_id', $donation['id'], $cancel_url );
				$member_level  = str_replace( 'member_', '', $this->member_levels->calculate_level( absint( $donation['amount'] ), strtolower( $donation['frequency'] ) ) );
				$messages[] = '
					<section class="m-donation m-donation-' . $member_level . '">
						<h4 class="a-donation-heading a-your-membership">Your ' . ucfirst( $member_level ) . ' Membership</h4>
						<h2 class="a-donation-amount">$' . $donation['amount'] . '</h2>
						<h3 class="a-donation-frequency">' . strtolower( $donation['frequency'] ) . '</h3>
					</section>
					<section class="m-next-donation">
						<h4 class="a-donation-heading a-next-transaction">Next Transaction Date</h4>
						<div class="a-next-transaction-date">' . date_i18n( 'F j, Y', strtotime( $donation['next_date'] ) ) . '</div>
					</section>
					<section class="m-donation-actions">
						<h4 class="a-donation-heading a-modify-donation">Modify Your Donation</h4>
						<a href="' . $edit_url . '" class="a-button a-button-update-payment">Update Payment Method</a>
						<div class="a-donation-actions a-button-sentence">
							<a href="' . $edit_url . '" class="a-button a-button-secondary">Change Amount</a>
							<a href="' . $cancel_url . '" class="a-button a-button-secondary">Stop</a>
						</div>
						<small class="a-form-caption">You will be able to review and confirm these actions in the final step.</small>
					</section>
					';
				//$message .= '<tr><td>$' . $donation['amount'] . ' ' . strtolower( $donation['frequency'] ) . '</td><td>' . date_i18n( 'F j, Y', strtotime( $donation['next_date'] ) ) . '</td><td><a href="#">Edit</a> | <a href="#">Cancel</a></td></tr>';
			}
			//$message .= '</table>';
		}

		if ( ! empty( $messages ) ) {
			foreach ( $messages as $donation_message ) {
				$message .= '<article class="m-donation-message">' . $donation_message . '</article>';
			}
		}

		return $message;
	}

}
