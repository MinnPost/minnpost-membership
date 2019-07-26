<?php
/**
 * Class file for the MinnPost_Membership_Front_End class.
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
class MinnPost_Membership_Front_End {

	public $option_prefix;
	public $file;
	public $version;
	public $slug;
	public $member_levels;
	public $user_info;
	public $content_items;
	public $cache;

	/**
	* Constructor which sets up front end
	*
	*/
	public function __construct() {

		$this->option_prefix = minnpost_membership()->option_prefix;
		$this->file          = minnpost_membership()->file;
		$this->version       = minnpost_membership()->version;
		$this->slug          = minnpost_membership()->slug;
		$this->member_levels = minnpost_membership()->member_levels;
		$this->user_info     = minnpost_membership()->user_info;
		$this->content_items = minnpost_membership()->content_items;
		$this->cache         = minnpost_membership()->cache;

		$this->mp_mem_transients = $this->cache->mp_mem_transients;

		$this->add_actions();

		$this->allowed_urls = $this->get_allowed_urls();

		$this->blocked_template_suffix = '-' . get_option( $this->option_prefix . 'post_access_single_template_suffix', '' );

		$this->user_claimed_statuses = array(
			'user_previously_claimed',
			'user_claimed_recently',
			'user_just_claimed',
		);

	}

	/**
	* Create the action hooks to create front end things
	*
	*/
	public function add_actions() {
		if ( ! is_admin() ) {
			add_action( 'wp_enqueue_scripts', array( $this, 'front_end_scripts_and_styles' ) );
		}

		// these two can be called with do_action in a theme or other template
		add_action( $this->option_prefix . 'site_header', array( $this, 'site_header' ), 10, 1 );
		add_action( $this->option_prefix . 'site_footer', array( $this, 'site_footer' ), 10, 1 );

		add_filter( 'allowed_redirect_hosts', array( $this, 'allowed_redirect_hosts' ), 10 );
		add_action( 'pre_get_posts', array( $this, 'set_query_properties' ), 10 );
		add_filter( 'init', array( $this, 'cortex_routes' ) );
		add_filter( 'document_title_parts', array( $this, 'set_wp_title' ) );

		// main donate form submit actions
		add_action( 'wp_ajax_donate_choose_form_submit', array( $this, 'donate_choose_form_submit' ) );
		add_action( 'wp_ajax_nopriv_donate_choose_form_submit', array( $this, 'donate_choose_form_submit' ) );

		// benefit level chooser form submit actions
		add_action( 'wp_ajax_benefit_choose_form_submit', array( $this, 'benefit_choose_form_submit' ) );
		add_action( 'wp_ajax_nopriv_benefit_choose_form_submit', array( $this, 'benefit_choose_form_submit' ) );

		// benefit redeem form submits
		add_action( 'wp_ajax_benefit_form_submit', array( $this, 'benefit_form_submit' ) );
		add_action( 'wp_ajax_nopriv_benefit_form_submit', array( $this, 'benefit_form_submit' ) );

		// this could be used for any other template as well, but we are sticking with single by default.
		add_filter( 'single_template', array( $this, 'template_show_or_block' ), 10, 3 );
		add_filter( 'appnexus_acm_provider_prevent_ads', array( $this, 'prevent_ads' ), 10, 2 );

		// handle the emails sent from this class
		add_filter( 'wp_mail_from', array( $this, 'mail_from' ) );
		add_filter( 'wp_mail_from_name', array( $this, 'mail_from_name' ) );
	}

	/**
	* Setup site header content for membership
	* @param bool $show_button
	* do_action does not appear to have optional parameters, so we have to pass the value either way.
	*
	*/
	public function site_header( $show_button ) {
		$params = array();

		$payment_urls = get_option( $this->option_prefix . 'payment_urls', '' );
		if ( '' !== $payment_urls ) {
			$payment_urls = explode( "\r\n", $payment_urls );
			$default_url  = $payment_urls[0];
		} else {
			$default_url = '';
		}
		$button_url = get_option( $this->option_prefix . 'button_url', $default_url );
		$parsed     = parse_url( $button_url );
		if ( empty( $parsed['scheme'] ) ) {
			$button_url = site_url( $button_url );
		}

		$button_text  = get_option( 'minnpost_membership_button_text', __( 'Donate', 'minnpost-largo' ) );
		$button_class = get_option( 'minnpost_membership_button_class', '' );
		if ( '' !== $button_class ) {
			$button_class = ' ' . $button_class;
		}

		$button_include_heart = filter_var( get_option( 'minnpost_membership_button_include_heart', false ), FILTER_VALIDATE_BOOLEAN );
		if ( true === $button_include_heart ) {
			$svg           = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" title="' . __( 'Heart', 'minnpost-membership' ) . '" class="icon icon-heart" viewBox="0 0 32 28" data-reactid="190"><path d="M16 5s-.516-1.531-1.49-2.51c-1.534-1.542-3.663-2.49-6.01-2.49s-4.472.951-6.01 2.49c-1.539 1.538-2.49 3.663-2.49 6.01s.951 4.472 2.49 6.01l13.51 13.49 13.51-13.49c1.539-1.538 2.49-3.663 2.49-6.01s-.951-4.472-2.49-6.01c-1.538-1.538-3.663-2.49-6.01-2.49s-4.476.948-6.01 2.49c-.974.979-1.49 2.51-1.49 2.51z" data-reactid="191"></path></svg>';
			$button_text   = $svg . $button_text;
			$button_class .= ' a-support-button-with-heart';
		}

		$tagline_text = get_option( 'minnpost_membership_tagline_text', get_bloginfo( 'description' ) );
		$tagline_text = preg_replace( '|([^\s])\s+([^\s]+)\s*$|', '$1&nbsp;$2', $tagline_text );

		$params['button_url']   = $button_url;
		$params['button_text']  = $button_text;
		$params['button_class'] = $button_class;
		$params['tagline_text'] = $tagline_text;
		$params['show_button']  = $show_button;

		$site_header = $this->get_template_html( 'header-support', 'template-parts', $params );
		echo $site_header;
	}

	/**
	* Setup site footer content for membership
	* @param bool $show_button
	* do_action does not appear to have optional parameters, so we have to pass the value either way.
	*
	*/
	public function site_footer( $show_button ) {
		$params = array();

		$redirect_url = defined( 'PAYMENT_PROCESSOR_URL' ) ? PAYMENT_PROCESSOR_URL : get_option( $this->option_prefix . 'payment_processor_url', '' );

		$params['button_url'] = $redirect_url;

		$site_footer = $this->get_template_html( 'footer-support', 'template-parts', $params );
		echo $site_footer;
	}

	/**
	* Allow for redirecting to the processor domain
	*
	* @param array $hosts
	* @return array $hosts
	*/
	public function allowed_redirect_hosts( $hosts ) {
		$processor_url = defined( 'PAYMENT_PROCESSOR_URL' ) ? PAYMENT_PROCESSOR_URL : get_option( $this->option_prefix . 'payment_processor_url', '' );
		$hosts[]       = parse_url( $processor_url, PHP_URL_HOST );
		return $hosts;
	}

	/**
	* Set query properties on membership pages
	*
	*/
	public function set_query_properties( $query ) {
		if ( ! is_admin() && isset( $query->query['is_membership'] ) && true === $query->query['is_membership'] ) {
			if ( $query->is_main_query() ) {
				$query->set( 'is_archive', false );
				$query->set( 'is_category', false );
				$query->set( 'is_home', false );
				$query->is_home = false;
			}
		}
	}

	/**
	* Create routes from plugin's allowed URLs
	*
	*/
	public function cortex_routes() {
		if ( ! class_exists( 'Brain\Cortex' ) ) {
			require_once( plugin_dir_path( __FILE__ ) . '../vendor/autoload.php' );
		}
		Brain\Cortex::boot();
		add_action(
			'cortex.routes',
			function( RouteCollectionInterface $routes ) {
				if ( '' !== $this->allowed_urls ) {
					foreach ( $this->allowed_urls as $url ) {
						$routes->addRoute(
							new QueryRoute(
								$url,
								function ( array $matches, $this_url ) {
									// send this object to the template so it can be called
									$minnpost_membership = minnpost_membership();
									// set a query var so we can filter it
									$query = array(
										'is_membership'  => true,
										'membership_url' => implode( '-', $this_url->chunks() ),
									);
									return $query;
								},
								[ 'template' => $this->get_template_for_url( $url ) ]
							)
						);
					}
				}
			}
		);
	}

	/**
	* Handle GET and POST parameters for membership
	*
	* @param string $direction
	* @return array $params
	*
	*/
	public function process_membership_parameters( $direction = 'get' ) {
		$params = array();
		if ( 'get' === $direction ) {
			$data = $_GET;
		} elseif ( 'post' === $direction ) {
			$data = $_POST;
		}
		if ( isset( $data['amount'] ) ) {
			$params['amount'] = filter_var( $data['amount'], FILTER_SANITIZE_NUMBER_INT );
		}
		if ( isset( $data['campaign'] ) ) {
			$params['campaign'] = filter_var( $data['campaign'], FILTER_SANITIZE_STRING );
		}
		if ( isset( $data['customer_id'] ) ) {
			$params['customer_id'] = filter_var( $data['customer_id'], FILTER_SANITIZE_STRING );
		}
		if ( isset( $data['email'] ) ) {
			$params['email'] = filter_var( $data['email'], FILTER_SANITIZE_EMAIL );
		}
		if ( isset( $data['firstname'] ) ) {
			$params['firstname'] = filter_var( $data['firstname'], FILTER_SANITIZE_STRING );
		}
		if ( isset( $data['frequency'] ) ) {
			$params['frequency'] = filter_var( $data['frequency'], FILTER_SANITIZE_STRING );
		}
		if ( isset( $data['lastname'] ) ) {
			$params['lastname'] = filter_var( $data['lastname'], FILTER_SANITIZE_STRING );
		}
		if ( isset( $data['show_ach'] ) ) {
			$params['show_ach'] = filter_var( $data['show_ach'], FILTER_SANITIZE_STRING );
		}

		return $params;
	}

	/**
	* Handle GET and POST parameters for benefits
	*
	* @param string $direction
	* @return array $params
	*
	*/
	public function process_benefit_parameters( $direction = 'get' ) {
		$params = array();
		if ( 'get' === $direction ) {
			$data = $_GET;
		} elseif ( 'post' === $direction ) {
			$data = $_POST;
		}

		if ( isset( $data['benefit-name'] ) ) {
			$params['benefit-name'] = filter_var( $data['benefit-name'], FILTER_SANITIZE_STRING );
		}

		if ( isset( $data['post_id'] ) ) {
			$params['post_id'] = filter_var( $data['post_id'], FILTER_SANITIZE_NUMBER_INT );
			if ( isset( $data[ 'instance-id-' . $data['post_id'] ] ) ) {
				$params['instance_id'] = filter_var( $data[ 'instance-id-' . $data['post_id'] ], FILTER_SANITIZE_NUMBER_INT );
			} elseif ( isset( $data['instance_id'] ) ) {
				$params['instance_id'] = filter_var( $data['instance_id'], FILTER_SANITIZE_NUMBER_INT );
			}
		}

		return $params;
	}

	/**
	* Set title tags
	*
	* @param array $title
	* @return array $title
	*
	*/
	public function set_wp_title( $title ) {
		$path = rtrim( wp_parse_url( $_SERVER['REQUEST_URI'], PHP_URL_PATH ), '/' );
		if ( in_array( $path, $this->allowed_urls ) ) {
			$title_path   = preg_replace( '/[\W\s\/]+/', '-', ltrim( $path, '/' ) );
			$title_option = get_option( $this->option_prefix . $title_path . '_title', '' );
			if ( '' !== $title_option ) {
				$title['title'] = $title_option;
			}
		}
		return $title;
	}

	/**
	* Process donate form submission
	*
	*/
	public function donate_choose_form_submit() {

		$redirect_url = defined( 'PAYMENT_PROCESSOR_URL' ) ? PAYMENT_PROCESSOR_URL : get_option( $this->option_prefix . 'payment_processor_url', '' );
		$error_url    = isset( $_POST['current_url'] ) ? filter_var( $_POST['current_url'], FILTER_SANITIZE_URL ) : '';
		if ( '' !== $redirect_url ) {

			$params = array();
			$params = $this->set_user_params( $_POST, $params );

			// sanitize form data we accept
			$post_params = $this->process_membership_parameters( 'post' );
			$params      = array_merge( $params, $post_params );

			// this page does not have a picker for each level, so the frequency is one field
			if ( isset( $_POST['frequencies'] ) ) {
				$params['frequency'] = $this->process_frequency_value( $_POST['frequencies'] );
			}

			// send the valid form data to the submit url as url parameters
			foreach ( $params as $key => $value ) {
				if ( false !== $value ) {
					$redirect_url = add_query_arg( $key, $value, $redirect_url );
				}
			}

			// amount is the only thing our processor requires in order to function
			if ( ! isset( $params['amount'] ) ) {
				$error_url = add_query_arg( 'errors', 'empty_amount', $error_url );
				wp_safe_redirect( site_url( $error_url ) );
				exit;
			}

			// this requires us to hook into the allowed url thing
			wp_safe_redirect( $redirect_url );
			exit;
		}
	}

	/**
	* Process benefit level choose form submission
	*
	*/
	public function benefit_choose_form_submit() {

		$payment_processor_url = defined( 'PAYMENT_PROCESSOR_URL' ) ? PAYMENT_PROCESSOR_URL : get_option( $this->option_prefix . 'payment_processor_url', '' );
		$submit_url            = get_option( $this->option_prefix . 'support-member-benefits_submit_url', '' );
		if ( '' !== $submit_url ) {
			$redirect_url = $submit_url;
		} else {
			$redirect_url = $payment_processor_url;
		}

		$error_url = isset( $_POST['current_url'] ) ? filter_var( $_POST['current_url'], FILTER_SANITIZE_URL ) : '';
		if ( '' !== $redirect_url ) {

			$params = array();
			$params = $this->set_user_params( $_POST, $params );

			// sanitize form data we accept
			$post_params = $this->process_membership_parameters( 'post' );
			$params      = array_merge( $params, $post_params );

			// because users can choose which level they want, this detects which submit button - and which benefit level - the user clicked
			$member_levels = $this->member_levels->get_member_levels();
			foreach ( $member_levels as $key => $value ) {
				$level_number = $key + 1;
				if ( isset( $_POST[ 'membership-submit-' . $level_number ] ) ) {
					$params['amount']    = filter_var( $_POST[ 'amount-level-' . $level_number ], FILTER_SANITIZE_NUMBER_INT );
					$params['frequency'] = $this->process_frequency_value( $_POST[ 'membership-frequency-' . $level_number ] );
					continue;
				}
			}

			// send the valid form data to the submit url as url parameters
			foreach ( $params as $key => $value ) {
				if ( false !== $value ) {
					$redirect_url = add_query_arg( $key, $value, $redirect_url );
				}
			}

			// amount is the only thing our processor requires in order to function
			if ( ! isset( $params['amount'] ) ) {
				$error_url = add_query_arg( 'errors', 'empty_amount', $error_url );
				wp_safe_redirect( site_url( $error_url ) );
				exit;
			}

			// this requires us to hook into the allowed url thing
			wp_safe_redirect( $redirect_url );
			exit;
		}
	}

	/**
	* Process benefit form submission
	*
	*/
	public function benefit_form_submit() {
		if ( wp_verify_nonce( $_POST['minnpost_membership_benefit_form_nonce'], 'mem-form-nonce' ) ) {
			$redirect_url = isset( $_POST['current_url'] ) ? filter_var( $_POST['current_url'], FILTER_SANITIZE_URL ) : '';
			$error_url    = isset( $_POST['current_url'] ) ? filter_var( $_POST['current_url'], FILTER_SANITIZE_URL ) : '';
			$is_ajax      = isset( $_POST['is_ajax'] ) ? filter_var( $_POST['is_ajax'], FILTER_VALIDATE_BOOLEAN ) : false;
			if ( '' !== $redirect_url ) {

				$error_data = array();

				// sanitize form data we accept
				$post_params = $this->process_benefit_parameters( 'post' );
				if ( isset( $params ) ) {
					$params = array_merge( $params, $post_params );
				} else {
					$params = $post_params;
				}

				if ( isset( $params['benefit-name'] ) ) {
					$benefit_name = $params['benefit-name'];
				} else {
					$error_data = array(
						'param' => 'missing_benefit',
					);
				}

				// there is error data from somewhere
				if ( ! empty( $error_data ) ) {
					if ( false === $is_ajax ) {
						$error_url = add_query_arg( 'errors', $error_data['param'], $error_url );
						wp_safe_redirect( site_url( $error_url ) );
						exit;
					} else {
						$data                 = get_post( $params['post_id'], 'ARRAY_A' );
						$offer_status_content = array_merge(
							$this->get_result_message( $error_data['param'], $benefit_name, $data ),
							$this->get_button_values( $error_data['param'], $benefit_name )
						);

						wp_send_json_error( $offer_status_content );
					}
				}

				$benefit_info = $this->get_user_benefit_info( $benefit_name );

				// if there is no current user info, exit
				if ( ! isset( $benefit_info['current_user'] ) ) {
					$error_data = array(
						'param' => 'ineligible_user',
					);
				}

				// if there are not can redeem and date eligible fields, exit
				if ( ! isset( $benefit_info['current_user']['can_redeem'] ) ) {
					$error_data = array(
						'param' => 'ineligible_user',
					);
				}

				// if the can redeem or date eligible fields are not true, exit
				if ( true !== filter_var( $benefit_info['current_user']['can_redeem'], FILTER_VALIDATE_BOOLEAN ) ) {
					$error_data = array(
						'param' => 'ineligible_user',
					);
				}

				// there is error data from somewhere
				if ( ! empty( $error_data ) ) {
					if ( false === $is_ajax ) {
						$error_url = add_query_arg( 'errors', $error_data['param'], $error_url );
						wp_safe_redirect( site_url( $error_url ) );
						exit;
					} else {
						$data                 = get_post( $params['post_id'], 'ARRAY_A' );
						$offer_status_content = array_merge(
							$this->get_result_message( $error_data['param'], $benefit_name, $data ),
							$this->get_button_values( $error_data['param'], $benefit_name )
						);

						wp_send_json_error( $offer_status_content );
					}
				}

				if ( true === $is_ajax ) {
					// check if user recently claimed an offer
					$user_status = $this->get_user_claim_status( 'account-benefits-', $benefit_name, $params['post_id'], '' );
					if ( isset( $user_status['status'] ) ) {
						$user_status_string = $user_status['status'];
					} else {
						$user_status_string = $user_status;
					}

					// user has recently claimed. show that error message.
					if ( '' !== $user_status_string && in_array( $user_status_string, $this->user_claimed_statuses ) ) {
						$user_claim           = isset( $this->content_items->get_user_offer_claims()[0] ) ? $this->content_items->get_user_offer_claims()[0] : null;
						$offer_status_content = array_merge(
							$this->get_result_message( $user_status, $benefit_name, $user_claim ),
							$this->get_button_values( $user_status, $benefit_name )
						);
						wp_send_json_error( $offer_status_content );
					}
				}

				// at this point, the user is ok, so handle the form submission
				// we do need to make sure they didn't already claim something.
				if ( 'partner-offers' === $benefit_name ) {
					$claim_result = $this->claim_partner_offer_instance( $params, $error_data );

					if ( 'error' === $claim_result['status'] ) {
						if ( false === $is_ajax ) {
							$error_url = add_query_arg( 'errors', $claim_result['param'], $error_url );
							if ( isset( $claim_result['not-claimed'] ) ) {
								$error_url = add_query_arg( 'not-claimed', $claim_result['not-claimed'], $error_url );
							}
							if ( isset( $claim_result['not-claimed-instance'] ) ) {
								$error_url = add_query_arg( 'not-claimed-instance', $claim_result['not-claimed-instance'], $error_url );
							}
							wp_safe_redirect( site_url( $error_url ) );
							exit;
						} else {
							$data = get_post( $params['post_id'], 'ARRAY_A' );
							if ( isset( $claim_result['not-claimed-instance'] ) ) {
								$data['not-claimed-instance'] = get_post_meta( $params['post_id'], '_mp_partner_offer_instance', true )[ $claim_result['not-claimed-instance'] ];
							}
							$offer_status_content = array_merge(
								$this->get_result_message( $claim_result['param'], $benefit_name, $data ),
								$this->get_button_values( $claim_result['param'], $benefit_name, $data )
							);
							if ( isset( $claim_result['not-claimed-instance'] ) ) {
								$offer_status_content['remove_instance_value'] = $claim_result['not-claimed-instance'];
							}
							wp_send_json_error( $offer_status_content );
						}
					} elseif ( 'success' === $claim_result['status'] ) {
						if ( false === $is_ajax ) {
							$redirect_url = add_query_arg( 'claimed', $claim_result['post_id'], $redirect_url );
							wp_safe_redirect( $redirect_url );
							exit;
						} else {
							$data                 = get_post( $params['post_id'], 'ARRAY_A' );
							$offer_status_content = array_merge(
								$this->get_result_message( $claim_result['param'], $benefit_name, $data ),
								$this->get_button_values( $claim_result['param'], $benefit_name )
							);
							wp_send_json_success( $offer_status_content );
						}
					}
				}
			} else {
				$error_data = array(
					'param' => 'missing_url',
				);
				if ( ! empty( $error_data ) ) {
					if ( false === $is_ajax ) {
						$error_url = add_query_arg( 'errors', $error_data['param'], $error_url );
						wp_safe_redirect( site_url( $error_url ) );
						exit;
					} else {
						$data                 = get_post( $params['post_id'], 'ARRAY_A' );
						$offer_status_content = array_merge(
							$this->get_result_message( $error_data['param'], $benefit_name, $data ),
							$this->get_button_values( $error_data['param'], $benefit_name )
						);

						wp_send_json_error();
					}
				}
			}
		}
	}

	/**
	* Set the user info parameters for form submission
	*
	* @param array $posted
	* @param array $params
	* @return array $params
	*
	*/
	private function set_user_params( $posted, $params ) {
		if ( wp_verify_nonce( $posted['minnpost_membership_form_nonce'], 'mem-form-nonce' ) ) {
			// do we already know who this user is?
			$user = wp_get_current_user();
			if ( isset( $user->first_name ) && '' !== $user->first_name ) {
				$params['firstname'] = $user->first_name;
			}
			if ( isset( $user->last_name ) && '' !== $user->last_name ) {
				$params['lastname'] = $user->last_name;
			}
			if ( isset( $user->user_email ) && '' !== $user->user_email ) {
				$params['email'] = $user->user_email;
			}
		}
		return $params;
	}

	/**
	* Claim a partner offer instance
	* @param array $params
	* @param array $error_data
	* @return array $claim_result
	*
	*/
	private function claim_partner_offer_instance( $params, $error_data = array() ) {
		if ( ! isset( $params['post_id'] ) ) {
			$claim_result = array(
				'status' => 'error',
				'param'  => 'missing_partner_offer',
			);
			return $claim_result;
		}

		if ( ! isset( $params['instance_id'] ) ) {
			$claim_result = array(
				'status'      => 'error',
				'param'       => 'user_tried_but_all_claimed',
				'not-claimed' => $params['post_id'],
			);
			return $claim_result;
		}

		$partner_offer = $this->content_items->get_partner_offers( $params['post_id'] );
		$instances     = $partner_offer->instances;

		if ( is_array( $instances ) ) {
			// check the selected instance for the user's claim
			$this_instance = $instances[ $params['instance_id'] ];

			// if this instance has a specific date that it can be used, don't give the user the next one automatically if it is already claimed
			if ( isset( $this_instance['_mp_partner_offer_instance_date'] ) && '' !== $this_instance['_mp_partner_offer_instance_date'] && isset( $this_instance['_mp_partner_offer_claimed_date'] ) && '' !== $this_instance['_mp_partner_offer_claimed_date'] ) {
				$claim_result = array(
					'status'               => 'error',
					'param'                => 'user_tried_but_this_instance_claimed',
					'not-claimed'          => $params['post_id'],
					'not-claimed-instance' => $params['instance_id'],
				);
				return $claim_result;
			}

			// if the instance is already claimed, try to give the user the next instance
			if ( isset( $this_instance['_mp_partner_offer_claimed_date'] ) && '' !== $this_instance['_mp_partner_offer_claimed_date'] ) {
				$instance_key = '';
				// and this is how. check all the instances until/unless there is an unclaimed one, and give the user that one
				foreach ( $instances as $key => $instance ) {
					if ( ! isset( $instance['_mp_partner_offer_claimed_date'] ) || '' === $instance['_mp_partner_offer_claimed_date'] ) {
						$instance_key = $key;
						break;
					}
				}
				if ( '' !== $instance_key ) {
					$this_instance = $instances[ $instance_key ];
				} else {
					$claim_result = array(
						'status'      => 'error',
						'param'       => 'user_tried_but_all_claimed',
						'not-claimed' => $params['post_id'],
					);
					return $claim_result;
				}
			} else {
				$instance_key  = $params['instance_id'];
				$this_instance = $instances[ $instance_key ];
			}
		} else {
			$claim_result = array(
				'status'      => 'error',
				'param'       => 'user_tried_but_all_claimed',
				'not-claimed' => $params['post_id'],
			);
			return $claim_result;
		}

		$current_user = wp_get_current_user();

		$claimed = current_time( 'timestamp' );

		$this_instance['_mp_partner_offer_claimed_date'] = $claimed;
		$this_instance['_mp_partner_offer_claim_user']   = array(
			'name' => $current_user->display_name,
			'id'   => get_current_user_id(),
		);

		$instances[ $instance_key ] = $this_instance;

		$update_instance = update_post_meta( $params['post_id'], '_mp_partner_offer_instance', $instances );
		//$update_instance = true;

		if ( true === $update_instance ) {

			$params['partner_offer']            = $partner_offer;
			$params['partner_offer']->instances = $instances;

			// send emails, if applicable
			$send_emails = $this->send_benefit_emails( 'account-benefits-partner-offers', $params, $current_user );

			$claim_result = array(
				'status'      => 'success',
				'param'       => 'user_just_claimed',
				'post_id'     => $params['post_id'],
				'instance_id' => $instance_key,
			);
			return $claim_result;
		}
	}

	/**
	* Choose template depending on whether a post has an access level, and if so, whether a user can access it.
	* The important thing to know is that this adds type-blocked-postname, type-blocked-post, type-blocked
	* to the beginning of the template hierarchy, and then attempts to locate them in the theme.
	* If no blocked templates exist, it will contine to check the default hierarchy for a matching file.
	*
	* @param string $template
	* @param string $type
	* @param array $templates
	*
	* @return string template
	*/
	public function template_show_or_block( $template, $type, $templates ) {
		global $post;
		$user_id          = get_current_user_id();
		$user_access_data = $this->user_info->get_user_access( $user_id );

		$can_access = $user_access_data['can_access'];
		$url_access = $user_access_data['url_access'];

		if ( true === $can_access ) {
			return $template;
		} else {
			$blocked_templates = array();
			foreach ( $templates as $default_template ) {
				$blocked_templates[] = substr_replace( $default_template, $type . $this->blocked_template_suffix, 0, strlen( $type ) );
			}
			$minnpost_membership = minnpost_membership();
			set_query_var( 'minnpost_membership', $minnpost_membership );
			$user_state = $user_access_data['state'];
			set_query_var( 'user_state', $user_state );
			if ( locate_template( $blocked_templates ) ) {
				$template = locate_template( $blocked_templates );
			} else {
				$template = dirname( __FILE__ ) . '/../templates/blocked/single.php';
			}
			return $template;
		}
	}

	/**
	* Allow the plugin to prevent ads on posts that have a paywall
	*
	* @param bool $prevent_ads
	* @param int $post_id
	* @return bool $prevent_ads
	*
	*/
	public function prevent_ads( $prevent_ads = false, $post_id = '' ) {
		if ( '' !== $post_id ) {
			$user_id    = get_current_user_id();
			$can_access = $this->user_info->get_user_access( $user_id )['can_access'];

			if ( true === $can_access ) {
				return $prevent_ads;
			} else {
				$prevent_ads = true;
			}
		}
		return $prevent_ads;
	}

	/**
	* Echo post form text
	*
	* @param int $page_amount
	* @param array $frequency
	* @param int $new_amount_this_year
	* @param int $user_id
	*
	*/
	public function post_form_text( $page_amount, $frequency, $new_amount_this_year, $user_id = 0 ) {

		$post_form_text_display = $this->get_post_form_text( $page_amount, $frequency, $new_amount_this_year, $user_id );

		if ( '' !== $post_form_text_display ) {
			echo $post_form_text_display;
		}

	}


	/**
	* Get post form text
	*
	* @param int $page_amount
	* @param array $frequency
	* @param int $amount_this_year
	* @param int $user_id
	*
	* @return string $post_form_text_display
	*
	*/
	private function get_post_form_text( $page_amount, $frequency, $amount_this_year, $user_id = 0 ) {
		$post_form_text_display = '';

		$page_level_slug = $this->member_levels->calculate_level( $page_amount, $frequency['value'], 'value', $amount_this_year );
		$page_level      = $this->member_levels->get_member_levels( $page_level_slug, true, 'slug' );

		$post_form_text_default = get_option( $this->option_prefix . 'support_post_form_nonmembers', '' );
		$post_form_text_default = str_replace( '$level', '<strong>' . get_bloginfo( 'name' ) . ' <span class="a-level">' . $page_level['name'] . '</span></strong>', $post_form_text_default );

		$post_form_text = $post_form_text_default;

		if ( 0 !== $user_id ) {
			$user_member_level  = $this->user_info->user_member_level( $user_id );
			$change_for_members = $this->user_info->change_for_members;

			$post_form_text_changed = get_option( $this->option_prefix . 'support_post_form_change', '' );
			$post_form_text_changed = str_replace( '$current_level', '<strong class="a-current-level">' . get_bloginfo( 'name' ) . ' ' . $user_member_level['name'] . '</strong>', $post_form_text_changed );
			$post_form_text_changed = str_replace( '$new_level', '<strong class="a-new-level">' . get_bloginfo( 'name' ) . ' <span class="a-level">' . $page_level['name'] . '</span></strong>', $post_form_text_changed );
			$post_form_text_changed = str_replace( '$level', '<strong>' . get_bloginfo( 'name' ) . ' <span class="a-level">' . $page_level['name'] . '</span></strong>', $post_form_text_changed );

			$post_form_text_not_changed = get_option( $this->option_prefix . 'support_post_form_nochange', '' );
			$post_form_text_not_changed = str_replace( '$current_level', '<strong class="a-current-level">' . get_bloginfo( 'name' ) . ' ' . $user_member_level['name'] . '</strong>', $post_form_text_not_changed );
			if ( true === filter_var( $change_for_members, FILTER_VALIDATE_BOOLEAN ) ) {
				if ( $page_level['name'] !== $user_member_level['name'] ) {
					$post_form_text = $post_form_text_changed;
				} else {
					$post_form_text = $post_form_text_not_changed;
				}
			} else {
				$post_form_text = $post_form_text_default;
			}
		}

		if ( '' === $post_form_text ) {
			return $post_form_text_display;
		}

		if ( true === filter_var( $change_for_members, FILTER_VALIDATE_BOOLEAN ) ) {
			$post_form_text_display .= '<p class="a-show-level a-show-level-' . strtolower( $page_level['name'] ) . '" data-changed="' . htmlentities( $post_form_text_changed ) . '" data-not-changed="' . htmlentities( $post_form_text_not_changed ) . '">';
		} else {
			$post_form_text_display .= '<p class="a-show-level a-show-level-' . strtolower( $page_level['name'] ) . '">';
		}

		if ( '' !== get_option( $this->option_prefix . 'support_post_form_link_url', '' ) ) {
			$post_form_text_display .= '<a href="' . esc_url( get_option( $this->option_prefix . 'support_post_form_link_url', '' ) ) . '">';
		}
		$post_form_text_display .= $post_form_text;
		if ( '' !== get_option( $this->option_prefix . 'support_post_form_link_url', '' ) ) {
			$post_form_text_display .= '</a>';
		}

		$post_form_text_display .= '</p>';

		return $post_form_text_display;
	}

	/**
	* Display the button if it is stored in the options
	*
	*/
	public function button( $page, $after = 'form', $state = '' ) {
		$link = $this->get_button( $page, $after, $state );
		if ( '' !== $link ) {
			echo $link;
		}
	}

	/**
	* Get the button if it is stored in the options
	*
	*/
	private function get_button( $page, $after = 'form', $state = '' ) {
		$link = '';
		if ( '' !== $state ) {
			$state = '_' . $state;
		}
		if ( '' !== get_option( $this->option_prefix . $page . '_post_' . $after . '_button_text' . $state, '' ) && '' !== get_option( $this->option_prefix . $page . '_post_' . $after . '_button_url' . $state, '' ) ) {

			$url = esc_url( get_option( $this->option_prefix . $page . '_post_' . $after . '_button_url' . $state, '' ) );

			$current_host = parse_url( $_SERVER['REQUEST_URI'], PHP_URL_HOST );
			$link_host    = parse_url( $url, PHP_URL_HOST );

			// preserve valid form parameters
			if ( '' === $link_host || $link_host === $current_host ) {
				$url_params = $this->process_membership_parameters( 'get' );
				foreach ( $url_params as $key => $value ) {
					if ( false !== $value ) {
						$url = add_query_arg( $key, $value, $url );
					}
				}
			}

			$link = '<a href="' . $url . '" class="a-button">' . get_option( $this->option_prefix . $page . '_post_' . $after . '_button_text' . $state, '' ) . '</a>';

		}
		return $link;
	}

	/**
	* Display the link next to the main button
	*
	*/
	public function link_next_to_button( $page, $after = 'form', $state = '' ) {
		$link = $this->get_link_next_to_button( $page, $after, $state );
		if ( '' !== $link ) {
			echo $link;
		}
	}

	/**
	* Get the link next to the main button
	*
	*/
	private function get_link_next_to_button( $page, $after = 'form', $state = '' ) {
		$link = '';
		if ( '' !== $state ) {
			$state = '_' . $state;
		}
		if ( '' !== get_option( $this->option_prefix . $page . '_post_' . $after . '_link_text_next_to_button' . $state, '' ) && '' !== get_option( $this->option_prefix . $page . '_post_' . $after . '_link_url_next_to_button' . $state, '' ) ) {

			$url = esc_url( get_option( $this->option_prefix . $page . '_post_' . $after . '_link_url_next_to_button' . $state, '' ) );

			$current_host = parse_url( $_SERVER['REQUEST_URI'], PHP_URL_HOST );
			$link_host    = parse_url( $url, PHP_URL_HOST );

			// preserve valid form parameters
			if ( '' === $link_host || $link_host === $current_host ) {
				$url_params = $this->process_membership_parameters( 'get' );
				foreach ( $url_params as $key => $value ) {
					if ( false !== $value ) {
						$url = add_query_arg( $key, $value, $url );
					}
				}
			}

			$link = '<a href="' . $url . '">' . get_option( $this->option_prefix . $page . '_post_' . $after . '_link_text_next_to_button' . $state, '' ) . '</a>';

		}
		return $link;
	}

	/**
	* Display the link after the body content
	*
	* @param string $page
	*
	*/
	public function post_body_text_link( $page ) {
		$link = $this->get_post_body_text_link( $page );
		if ( '' !== $link ) {
			echo $link;
		}
	}

	/**
	* Get the link after the body content
	*
	* @param string $page
	* @return string $full_text
	*
	*/
	private function get_post_body_text_link( $page ) {
		$full_text = '';
		if ( '' !== get_option( $this->option_prefix . $page . '_post_body_text_link', '' ) ) {

			$text          = get_option( $this->option_prefix . $page . '_post_body_text_link', '' );
			$url           = get_option( $this->option_prefix . $page . '_post_body_link_url', '' );
			$link_text     = get_option( $this->option_prefix . $page . '_post_body_link_text', '' );
			$link_fragment = ltrim( get_option( $this->option_prefix . $page . '_post_body_link_fragment', '' ), '#' );
			$link_class    = get_option( $this->option_prefix . $page . '_post_body_link_class', '' );
			$link_text     = get_option( $this->option_prefix . $page . '_post_body_link_text', '' );

			$url = esc_url( $url );

			$current_host = parse_url( $_SERVER['REQUEST_URI'], PHP_URL_HOST );
			$link_host    = parse_url( $url, PHP_URL_HOST );

			if ( '' !== $url && '' !== $link_text ) {
				if ( '' !== $link_fragment ) {
					$url .= '#' . $link_fragment;
				}
				if ( '' !== $link_class ) {
					$class = ' class="' . $link_class . '"';
				} else {
					$class = '';
				}

				// preserve valid form parameters
				if ( '' === $link_host || $link_host === $current_host ) {
					$url_params = $this->process_membership_parameters( 'get' );
					foreach ( $url_params as $key => $value ) {
						if ( false !== $value ) {
							$url = add_query_arg( $key, $value, $url );
						}
					}
				}

				$link = '<a href="' . $url . '"' . $class . '>' . $link_text . '</a>';
			}

			$link = str_replace( $link_text, $link, $text );

			$full_text = '<h3 class="a-finish-strong">' . $link . '</h3>';

		}

		return $full_text;
	}

	/**
	* Get correct template path for URLs from plugin or theme folder
	*
	* @param string $url
	* @return string $theme_path|$plugin_path
	*
	*/
	private function get_template_for_url( $url ) {
		$location = 'front-end/';

		$template_name = preg_replace( '/[\W\s\/]+/', '-', ltrim( $url, '/' ) );

		$theme_path  = get_theme_file_path() . '/' . $this->slug . '-templates/' . $location . $template_name;
		$plugin_path = plugin_dir_path( __FILE__ ) . '../templates/' . $location . $template_name;

		if ( file_exists( $theme_path . '.php' ) ) {
			return $theme_path;
		} elseif ( file_exists( $plugin_path . '.php' ) ) {
			return $plugin_path;
		}

	}

	/**
	* Create array from URL options. These are the allowed public URLs for this plugin.
	*
	* @return array $urls
	*
	*/
	private function get_allowed_urls( $key = '' ) {
		$urls = array();

		$payment_urls                = get_option( $this->option_prefix . 'payment_urls', '' );
		$explain_member_benefit_urls = get_option( $this->option_prefix . 'explain_member_benefit_urls', '' );
		$use_member_benefit_urls     = get_option( $this->option_prefix . 'use_member_benefit_urls', '' );

		$all_urls  = '';
		$all_urls .= $payment_urls;
		$all_urls .= "\r\n" . $explain_member_benefit_urls;
		$all_urls .= "\r\n" . $use_member_benefit_urls;
		$all_urls  = explode( "\r\n", $all_urls );
		if ( 0 === $key ) {
			foreach ( $all_urls as $url ) {
				$url       = ltrim( $url, '/' );
				$url_array = explode( '/', $url );
				$urls[]    = $url_array[0];
			}
		}

		$urls = $all_urls;

		return $urls;
	}

	/**
	* Process frequency value so it returns the correct value for the payment processor
	*
	* @param string $frequency
	* @return string $frequency
	*
	*/
	private function process_frequency_value( $frequency ) {
		$frequency = filter_var( $frequency, FILTER_SANITIZE_STRING );
		$options   = $this->member_levels->get_frequency_options( $frequency, 'value' );
		// if we don't get a valid frequency back, just return false so it won't be on the url
		if ( false !== $options ) {
			$frequency = $options['id'];
		} else {
			$frequency = $options;
		}
		return $frequency;
	}

	/**
	* Front end styles. Load the CSS and/or JavaScript
	*
	* @return void
	*/
	public function front_end_scripts_and_styles() {
		// we need to make this themeable, i think
		$disable_javascript = get_option( $this->option_prefix . 'disable_javascript', false );
		$disable_css        = get_option( $this->option_prefix . 'disable_css', false );
		if ( true !== filter_var( $disable_javascript, FILTER_VALIDATE_BOOLEAN ) ) {
			wp_enqueue_script( $this->slug . '-front-end', plugins_url( 'assets/js/' . $this->slug . '-front-end.min.js', dirname( __FILE__ ) ), array( 'jquery' ), filemtime( plugin_dir_path( __FILE__ ) . '../assets/js/' . $this->slug . '-front-end.min.js' ) );
			$minnpost_membership_data = $this->get_user_membership_info();
			wp_localize_script( $this->slug . '-front-end', 'minnpost_membership_data', $minnpost_membership_data );
			wp_localize_script(
				$this->slug . '-front-end',
				'minnpost_membership_settings',
				array(
					'ajaxurl' => admin_url( 'admin-ajax.php' ),
				)
			);
			if ( ! wp_script_is( 'jquery', 'done' ) ) {
				wp_enqueue_script( 'jquery' );
			}
			wp_add_inline_script(
				$this->slug . '-front-end',
				"jQuery(document).ready(function ($) {
					$('.m-form-membership').minnpostMembership();
				});"
			);
		}
		if ( true !== filter_var( $disable_css, FILTER_VALIDATE_BOOLEAN ) ) {
			wp_enqueue_style( $this->slug . '-front-end', plugins_url( 'assets/css/' . $this->slug . '-front-end.min.css', dirname( __FILE__ ) ), array(), filemtime( plugin_dir_path( __FILE__ ) . '../assets/css/' . $this->slug . '-front-end.min.css' ), 'all' );
		}
	}

	/**
	* Get the current user's membership information
	*
	* @return array $user_membership_info
	*/
	public function get_user_membership_info() {

		global $wp_query;
		$url = '';
		if ( isset( $wp_query->query_vars['membership_url'] ) ) {
			$url = $wp_query->query_vars['membership_url'];
		}

		$user_id          = get_current_user_id();
		$user_access_data = $this->user_info->get_user_access( $user_id, $url );

		$url_access   = $user_access_data['url_access'];
		$current_user = $this->user_info->user_membership_info( $user_id );

		$current_user['can_access'] = $user_access_data['can_access'];

		$user_membership_info = array(
			'member_level_prefix' => $this->member_levels->member_level_prefix,
			'current_user'        => $current_user,
			'url_access_level'    => $url_access,
		);
		return $user_membership_info;
	}

	/**
	* Get the current user's benefit information
	*
	* @param string $benefit_name
	* @return array $user_benefit_info
	*/
	public function get_user_benefit_info( $benefit_name ) {

		$user_id          = get_current_user_id();
		$user_access_data = $this->user_info->get_user_benefit_eligibility( $benefit_name, $user_id );

		$benefit_access = $user_access_data['benefit_access'];
		$can_redeem     = $user_access_data['can_redeem'];
		$current_user   = $this->user_info->user_membership_info( $user_id );

		$current_user['can_redeem'] = $can_redeem;

		$user_membership_info = array(
			'member_level_prefix'  => $this->member_levels->member_level_prefix,
			'current_user'         => $current_user,
			'benefit_access_level' => $benefit_access,
		);
		return $user_membership_info;
	}

	/**
	* Get option field based on a user's status
	*
	* @param string $key
	* @param string $user_state
	* @return string $option_value
	*/
	public function get_option_based_on_user_status( $key, $user_state = '', $user_id = '' ) {
		$option_value = '';
		if ( '' === $user_state ) {
			$path       = sanitize_title( rtrim( parse_url( $_SERVER['REQUEST_URI'], PHP_URL_PATH ), '/' ) );
			$user_state = $this->user_info->get_user_access( '', $path )['state'];
		}
		$option_key   = $key . '_' . $user_state;
		$option_value = get_option( $option_key, '' );
		if ( '' !== $user_state ) {
			if ( '' === $user_id ) {
				$user_id = get_current_user_id();
			}
			if ( 0 !== $user_id ) {
				$user_member_level = $this->user_info->user_member_level( $user_id );
				$option_value      = str_replace( '$memberlevel', '<strong class="a-current-level">' . get_bloginfo( 'name' ) . ' ' . $user_member_level['name'] . '</strong>', $option_value );
			}
		}

		return $option_value;
	}

	/**
	 * Renders the contents of the given template to a string and returns it.
	 *
	 * @param string $template_name The name of the template to render (without .php)
	 * @param string $location      Folder location for the template (ie front-end or admin)
	 * @param array  $attributes    The PHP variables for the template
	 *
	 * @return string               The contents of the template.
	 */
	public function get_template_html( $template_name, $location = '', $attributes = null ) {
		if ( ! $attributes ) {
			$attributes = array();
		}

		if ( '' !== $location ) {
			$location = $location . '/';
		}

		ob_start();

		do_action( 'minnpost_membership_before_' . $template_name );

		// allow users to put templates into their theme
		if ( file_exists( get_theme_file_path() . '/' . $this->slug . '-templates/' . $location . $template_name . '.php' ) ) {
			$file = get_theme_file_path() . '/' . $this->slug . '-templates/' . $location . $template_name . '.php';
		} else {
			$file = plugin_dir_path( __FILE__ ) . '../templates/' . $location . $template_name . '.php';
		}

		require( $file );

		do_action( 'minnpost_membership_after_' . $template_name );

		$html = ob_get_contents();
		ob_end_clean();

		return $html;
	}

	/**
	* Get content for partner offer that changes based on its claim/availability/etc status
	* @param object $post
	* @param array $instances
	* @param object $user_claim
	* @return array $offer_status
	*
	*/
	public function get_partner_offer_status_content( $post, $instances, $user_claim ) {

		$data           = array();
		$benefit_prefix = 'account-benefits-';
		$benefit_name   = 'partner-offers';

		$user_state = $this->user_info->get_user_access( '', 'support-partner-offers' )['state'];

		$status = '';

		// no logged in user
		if ( 'not_logged_in' === $user_state ) {
			$status               = $user_state;
			$offer_status_content = array_merge(
				$this->get_result_message( $status, $benefit_name ),
				$this->get_button_values( $status, $benefit_name )
			);
			return $offer_status_content;
		}

		// user is not eligible based on membership
		if ( 'member_eligible' !== $user_state ) {
			$status = 'ineligible_user';
		}

		// the url indicates errors
		$errors = isset( $_GET['errors'] ) ? filter_var( $_GET['errors'], FILTER_SANITIZE_STRING ) : '';
		if ( '' !== $errors ) {
			$post_id              = (int) $post->ID;
			$not_claimed          = isset( $_GET['not-claimed'] ) ? (int) filter_var( $_GET['not-claimed'], FILTER_SANITIZE_STRING ) : 0;
			$not_claimed_instance = isset( $_GET['not-claimed-instance'] ) ? (int) filter_var( $_GET['not-claimed-instance'], FILTER_SANITIZE_STRING ) : '';
			if ( $post_id === $not_claimed ) {
				$status = $errors;
			}
			if ( '' !== $not_claimed_instance ) {
				$data['not-claimed-instance'] = $instances[ $not_claimed_instance ];
			}
		}

		// the offer is not claimable right now
		if ( true !== filter_var( $post->claimable, FILTER_VALIDATE_BOOLEAN ) ) {
			$status = 'not_claimable_yet';
			$data   = array(
				'claimable_start_date' => $post->claimable_start_date,
				'claimable_end_date'   => $post->claimable_end_date,
			);

			$offer_status_content = array_merge(
				$this->get_result_message( $status, $benefit_name, $data ),
				$this->get_button_values( $status, $benefit_name )
			);
		}

		// if the offer is claimable and user has not already been filtered out, check to see how many instances the offer has remaining
		if ( '' === $status || empty( $status ) ) {
			// if the user is eligible to claim, check to see if they have claimed too recently
			$user_status = $this->get_user_claim_status( $benefit_prefix, $benefit_name, $post->ID, $user_claim );
			// if there are remaining instances, OR if this offer has been claimed by this user, use their user status
			if ( 0 < $post->unclaimed_instance_count || in_array( $user_status['status'], $this->user_claimed_statuses ) ) {
				$status = $user_status;
			} else {
				$status = 'all_claimed';
			}
		}

		if ( empty( $data ) && ! empty( $user_claim ) ) {
			$data = $user_claim;
		}

		if ( ! isset( $offer_status_content ) ) {
			$offer_status_content = array_merge(
				$this->get_result_message( $status, $benefit_name, $data ),
				$this->get_button_values( $status, $benefit_name, $data )
			);
		}
		return $offer_status_content;
	}

	/**
	* Get content for benefit that changes based on its claim/availability/etc status
	* @param string $benefit_prefix
	* @param string $benefit_name
	* @param int $post_id
	* @param object $user_claim
	* @return array $user_claim_status
	*
	*/
	public function get_user_claim_status( $benefit_prefix, $benefit_name, $post_id = 0, $user_claim = null ) {
		$user_claim_status = array();

		$user_claim = isset( $this->content_items->get_user_offer_claims()[0] ) ? $this->content_items->get_user_offer_claims()[0] : null;

		// user has not claimed an offer
		if ( null === $user_claim ) {
			$user_claim_status['status'] = 'user_is_eligible';
			return $user_claim_status;
		}

		// user has claimed an offer
		$post_id  = (int) $post_id;
		$claim_id = isset( $user_claim->ID ) ? (int) $user_claim->ID : 0;

		// here we check to see if the user is eligible to claim this offer based on date of most recent previous claim
		$how_often            = get_option( $this->option_prefix . $benefit_prefix . $benefit_name . '_claim_frequency', '' );
		$next_claim           = strtotime( '+' . $how_often, $user_claim->user_claimed );
		$next_claim_formatted = date_i18n( get_option( 'date_format' ), $next_claim );

		// it wasn't this one
		if ( ( $post_id !== $claim_id ) && ( 0 !== $claim_id ) ) {
			$now = current_time( 'timestamp' );
			if ( $next_claim > $now ) {
				$user_claim_status['status']                      = 'user_claimed_recently';
				$user_claim_status['next_claim_eligibility_date'] = $next_claim_formatted;
				$user_claim_status['claimed_date']                = $user_claim->user_claimed;
			} else {
				$user_claim_status['status'] = 'user_is_eligible';
			}
		} elseif ( $post_id === $claim_id ) {
			// it was this one
			$claimed = isset( $_GET['claimed'] ) ? (int) filter_var( $_GET['claimed'], FILTER_SANITIZE_STRING ) : 0;
			if ( $post_id === $claimed ) {
				$user_claim_status['status'] = 'user_just_claimed';
			} else {
				$user_claim_status['status']                      = 'user_previously_claimed';
				$user_claim_status['next_claim_eligibility_date'] = $next_claim_formatted;
				$user_claim_status['claimed_date']                = $user_claim->user_claimed;
			}
		}
		return $user_claim_status;
	}

	/**
	 * Finds and returns button attributes for the given status code.
	 *
	 * @param array|string $param        The status parameter to look up and any other values it comes with
	 * @param string $benefit_name The benefit name
	 * @param array $data     This should be user data, either provided by a form or a hook
	 *
	 * @return array               Button attributes
	 */
	public function get_button_values( $params, $benefit_name = '', $data = array() ) {
		if ( is_array( $params ) && ! empty( $params ) ) {
			$params = filter_var_array( $params, FILTER_SANITIZE_STRING );
			if ( isset( $params['status'] ) ) {
				$param = $params['status'];
			}
		} else {
			$param = filter_var( $params, FILTER_SANITIZE_STRING );
		}
		$custom_button = apply_filters( 'minnpost_membership_custom_button', '', $params, $data );
		if ( '' !== $custom_button ) {
			return $custom_button;
		}
		// example to change the button
		/*
		add_filter( 'minnpost_membership_custom_button', 'button', 10, 3 );
		function button( $button, $params, $data ) {
			$button = array(
				'button_value' => 'whatever',
				'button_class' => 'whatever',
				'button_attr'  => 'whatever',
				'button_label' => 'whatever',
			);
			return $button;
		}
		*/
		$benefit_name = 'account-benefits-' . $benefit_name;

		$button = array(
			'button_value' => '',
			'button_class' => '',
			'button_attr'  => '',
			'button_label' => get_option( $this->option_prefix . $benefit_name . '_' . $param . '_button', '' ),
		);

		switch ( $param ) {
			case 'not_logged_in':
				$button['button_value'] = wp_login_url( $_SERVER['REQUEST_URI'] );
				return $button;
			case 'ineligible_user':
				$button['button_class'] = 'a-button-disabled';
				$button['button_attr']  = 'disabled';
				return $button;
			case 'user_claimed_recently':
				$button['button_class'] = 'a-button-disabled';
				$button['button_attr']  = 'disabled';
				return $button;
			case 'user_previously_claimed':
				$button['button_value'] = get_the_ID();
				$button['button_class'] = 'a-button-disabled';
				$button['button_attr']  = 'disabled';
				return $button;
			case 'user_just_claimed':
				$button['button_value'] = get_the_ID();
				$button['button_class'] = 'a-button-claimed';
				$button['button_attr']  = 'disabled';
				return $button;
			case 'not_claimable_yet':
				$button['button_value'] = '';
				$button['button_class'] = 'a-button-disabled';
				$button['button_attr']  = 'disabled';
				return $button;
			case 'user_is_eligible':
				$button['button_value'] = get_the_ID();
				return $button;
			case 'all_claimed':
				$button['button_value'] = get_the_ID();
				$button['button_class'] = 'a-button-disabled';
				$button['button_attr']  = 'disabled';
				return $button;
			case 'user_tried_but_all_claimed':
				$button['button_value'] = get_the_ID();
				$button['button_class'] = 'a-button-disabled';
				$button['button_attr']  = 'disabled';
				return $button;
			case 'user_tried_but_this_instance_claimed':
				$button['button_value'] = $data['ID'];
				return $button;
			default:
				return $button;
		}
	}

	/**
	 * Finds and returns a matching result message for the given status code.
	 *
	 * @param string|array $params        The status parameter to look up and any other values it comes with
	 * @param string $benefit_name The benefit name
	 * @param array $data     This should be user data, either provided by a form or a hook
	 *
	 * @return array               Message attributes
	 */
	public function get_result_message( $params, $benefit_name = '', $data = array() ) {
		if ( is_array( $params ) && ! empty( $params ) ) {
			$params = filter_var_array( $params, FILTER_SANITIZE_STRING );
			if ( isset( $params['status'] ) ) {
				$param = $params['status'];
			}
		} else {
			$param = filter_var( $params, FILTER_SANITIZE_STRING );
		}
		$custom_message = apply_filters( 'minnpost_membership_custom_error_message', '', $params, $data );
		if ( ! empty( $custom_message ) ) {
			return $custom_message;
		}
		// example to change the result message
		/*
		add_filter( 'minnpost_membership_custom_result_message', 'result_message', 10, 3 );
		function result_message( $message, $params, $data ) {
			$message = 'this is my error';
			return $message;
		}
		*/
		if ( '' !== $benefit_name ) {
			$benefit_name = 'account-benefits-' . $benefit_name . '_';
		}

		$message = array(
			'message'       => get_option( $this->option_prefix . $benefit_name . $param . '_status_message', '' ),
			'message_class' => '',
		);

		switch ( $param ) {
			case 'empty_amount':
				$message['message_class'] = 'm-benefit-message-error';
				return $message;
			case 'not_logged_in':
				$message['message_class'] = 'm-benefit-message-info';
				return $message;
			case 'ineligible_user':
				$message['message_class'] = 'm-benefit-message-error';
				return $message;
			case 'user_claimed_recently':
				$message['message_class'] = 'm-benefit-message-info';
				$message['message']       = str_replace( '$quantity', $data->quantity, $message['message'] );
				$message['message']       = str_replace( '$type', $data->offer_type, $message['message'] );
				$message['message']       = str_replace( '$offer', $data->post_title, $message['message'] );
				$message['message']       = str_replace( '$next_claim_eligibility_date', $params['next_claim_eligibility_date'], $message['message'] );
				$message['message']       = str_replace( '$claimed_date', date_i18n( get_option( 'date_format' ), $params['claimed_date'] ), $message['message'] );
				return $message;
			case 'user_previously_claimed':
				$message['message_class'] = 'm-benefit-message-success';
				$message['message']       = str_replace( '$quantity', $data->quantity, $message['message'] );
				$message['message']       = str_replace( '$type', $data->offer_type, $message['message'] );
				$message['message']       = str_replace( '$offer', $data->post_title, $message['message'] );
				$message['message']       = str_replace( '$next_claim_eligibility_date', $params['next_claim_eligibility_date'], $message['message'] );
				$message['message']       = str_replace( '$claimed_date', date_i18n( get_option( 'date_format' ), $params['claimed_date'] ), $message['message'] );
				return $message;
			case 'user_just_claimed':
				$message['message_class'] = 'm-benefit-message-success';
				return $message;
			case 'not_claimable_yet':
				$message['message']       = str_replace( '$start_date', date_i18n( get_option( 'date_format' ), $data['claimable_start_date'] ), $message['message'] );
				$message['message']       = str_replace( '$start_time', date_i18n( get_option( 'time_format' ), $data['claimable_start_date'] ), $message['message'] );
				$message['message']       = str_replace( '$end_date', date_i18n( get_option( 'date_format' ), $data['claimable_end_date'] ), $message['message'] );
				$message['message']       = str_replace( '$end_time', date_i18n( get_option( 'time_format' ), $data['claimable_end_date'] ), $message['message'] );
				$message['message_class'] = 'm-benefit-message-future';
				return $message;
			case 'user_tried_but_all_claimed':
				$message['message_class'] = 'm-benefit-message-error';
				return $message;
			case 'user_tried_but_this_instance_claimed':
				$message['message_class'] = 'm-benefit-message-error';
				$instance_date            = date_i18n( get_option( 'date_format' ), $data['not-claimed-instance']['_mp_partner_offer_instance_date'] ) . ' @ ' . date_i18n( get_option( 'time_format' ), $data['not-claimed-instance']['_mp_partner_offer_instance_date'] );
				$message['message']       = str_replace( '$date', $instance_date, $message['message'] );
				return $message;
			default:
				return $message;
		}
	}

	/**
	 * Sending emails when a claim successfully happens
	 *
	 * @param string $benefit_name    The full benefit path name
	 * @param array  $params          The submitted parameters
	 * @param object $current_user    The currently logged in user
	 *
	 * @return array $result
	 */
	private function send_benefit_emails( $benefit_name, $params, $current_user ) {
		$result = array();

		$send_admin_alert = get_option( $this->option_prefix . $benefit_name . '_send_email_alert_email', false );
		$send_claim_email = get_option( $this->option_prefix . $benefit_name . '_send_email_to_claiming_user_email', false );

		$from_email = get_option( $this->option_prefix . $benefit_name . '_email_sending_address_email', '' );
		$from_name  = get_option( $this->option_prefix . $benefit_name . '_email_sending_name_email', '' );

		if ( true === filter_var( $send_claim_email, FILTER_VALIDATE_BOOLEAN ) ) {
			// send email to claiming user
			if ( 'account-benefits-partner-offers' === $benefit_name ) {
				$claiming_user_id = $params['partner_offer']->instances[ $params['instance_id'] ]['_mp_partner_offer_claim_user']['id'];
				$claiming_user    = get_userdata( $claiming_user_id );

				$user_to      = $claiming_user->user_email;
				$user_subject = get_option( $this->option_prefix . $benefit_name . '_subject_email', '' );

				// handle WordPress formatting and make it email friendly
				$user_body = wpautop( get_option( $this->option_prefix . $benefit_name . '_body_email', '' ) );
				$user_body = str_replace( '<a href="', '<a style="color: #801019; text-decoration: none;" href="', $user_body );
				$user_body = str_replace( '<p>', '<p style="font-family: Georgia, \'Times New Roman\', Times, serif; font-size: 16px; line-height: 20.787px; margin: 0 0 15px; padding: 0;">', $user_body );

				// replace variables here
				$user_body = str_replace( '$quantity', $params['partner_offer']->quantity, $user_body );
				$user_body = str_replace( '$type', $params['partner_offer']->offer_type, $user_body );
				$user_body = str_replace( '$offer', $params['partner_offer']->post_title, $user_body );

				$params['user_body'] = $user_body;
				$user_message        = $this->get_template_html( 'claim-partner-offer-for-users', 'email', $params );
			}
			$user_mail      = wp_mail( $user_to, $user_subject, $user_message );
			$result['user'] = $user_mail;
		}

		if ( true === filter_var( $send_admin_alert, FILTER_VALIDATE_BOOLEAN ) ) {
			// send admin email
			$admin_to = get_option( $this->option_prefix . $benefit_name . '_alert_email_address_email', '' );
			if ( 'account-benefits-partner-offers' === $benefit_name ) {
				$admin_subject = 'Partner Offer Claim Alert';
				$admin_message = $this->get_template_html( 'claim-partner-offer-for-admins', 'email', $params );
			}
			$admin_mail      = wp_mail( $admin_to, $admin_subject, $admin_message );
			$result['admin'] = $admin_mail;
		}

		return $result;
	}

	/**
	 * Sending email address
	 *
	 * @param string $from_email    The original address
	 *
	 * @return string $from_email
	 */
	public function mail_from( $from_email ) {
		$current_url = isset( $_POST['current_url'] ) ? filter_var( $_POST['current_url'], FILTER_SANITIZE_URL ) : $_SERVER['REQUEST_URI'];
		if ( in_array( $current_url, $this->allowed_urls ) ) {
			$benefit_name = preg_replace( '/[\W\s\/]+/', '-', ltrim( $current_url, '/' ) );
			$from_email   = get_option( $this->option_prefix . $benefit_name . '_email_sending_address_email', '' );
		}
		return $from_email;
	}

	/**
	 * Sending email name
	 *
	 * @param string $from_name    The original name
	 *
	 * @return string $from_name
	 */
	public function mail_from_name( $from_name ) {
		$current_url = isset( $_POST['current_url'] ) ? filter_var( $_POST['current_url'], FILTER_SANITIZE_URL ) : $_SERVER['REQUEST_URI'];
		if ( in_array( $current_url, $this->allowed_urls ) ) {
			$benefit_name = preg_replace( '/[\W\s\/]+/', '-', ltrim( $current_url, '/' ) );
			$from_name    = get_option( $this->option_prefix . $benefit_name . '_email_sending_name_email', '' );
		}
		return $from_name;
	}

}
