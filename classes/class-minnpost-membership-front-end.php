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

	protected $option_prefix;
	protected $version;
	protected $slug;
	protected $member_levels;
	protected $user_info;
	protected $cache;

	/**
	* Constructor which sets up front end
	*
	* @param string $option_prefix
	* @param string $version
	* @param string $slug
	* @param object $member_levels
	* @param object $user_info
	* @param object $cache
	* @throws \Exception
	*/
	public function __construct( $option_prefix, $version, $slug, $member_levels, $user_info, $cache ) {

		$this->option_prefix = $option_prefix;
		$this->version       = $version;
		$this->slug          = $slug;
		$this->member_levels = $member_levels;
		$this->user_info     = $user_info;
		$this->cache         = $cache;

		$this->mp_mem_transients = $this->cache->mp_mem_transients;

		$this->add_actions();

		$this->allowed_urls = $this->get_allowed_urls();

	}

	/**
	* Create the action hooks to create front end things
	*
	*/
	public function add_actions() {
		if ( ! is_admin() ) {
			add_action( 'wp_enqueue_scripts', array( $this, 'front_end_scripts_and_styles' ) );
		}
		add_filter( 'allowed_redirect_hosts', array( $this, 'allowed_redirect_hosts' ), 10 );
		add_action( 'pre_get_posts', array( $this, 'set_query_properties' ), 10 );
		add_filter( 'init', array( $this, 'cortex_routes' ) );
		add_filter( 'document_title_parts', array( $this, 'set_wp_title' ) );
		add_action( 'wp_ajax_membership_form_submit', array( $this, 'form_submit' ) );
		add_action( 'wp_ajax_nopriv_membership_form_submit', array( $this, 'form_submit' ) );
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
			$query->set( 'is_archive', false );
			$query->set( 'is_category', false );
			$query->set( 'is_home', false );
		}
	}

	/**
	* Create routes from plugin's allowed URLs
	*
	*/
	public function cortex_routes() {
		if ( ! class_exists( 'Brain\Cortex' ) ) {
			require_once( plugin_dir_path( __FILE__ ) . 'vendor/autoload.php' );
		}
		Brain\Cortex::boot();
		add_action( 'cortex.routes', function( RouteCollectionInterface $routes ) {
			foreach ( $this->allowed_urls as $url ) {
				$routes->addRoute( new QueryRoute(
					$url,
					function ( array $matches ) {
						// send this object to the template so it can be called
						global $minnpost_membership;
						$minnpost_membership = MinnPost_Membership::get_instance();
						// set a query var so we can filter it
						$query = array(
							'is_membership' => true,
						);
						return $query;
					},
					[ 'template' => $this->get_template_for_url( $url ) ]
				));
			}
		});
	}

	/**
	* Handle GET parameters
	*
	* @param string $direction
	* @return array $params
	*
	*/
	public function process_parameters( $direction = 'get' ) {
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
	* Set title tags
	*
	* @param array $title
	* @return array $title
	*
	*/
	public function set_wp_title( $title ) {
		$path = rtrim( parse_url( $_SERVER['REQUEST_URI'], PHP_URL_PATH ), '/' );
		if ( in_array( $path, $this->allowed_urls ) ) {
			$title_path   = preg_replace( '/[\W\s\/]+/', '-', ltrim( $path, '/' ) );
			$title_option = get_option( $this->option_prefix . $title_path . '_title', '' );
			if ( '' !== $title_option ) {
				$title['title'] = $title_option . ' | ' . get_bloginfo( 'name' );
			}
		}
		return $title;
	}

	/**
	* Process membership form submission
	*
	*/
	public function form_submit() {
		if ( wp_verify_nonce( $_POST['minnpost_membership_form_nonce'], 'mem-form-nonce' ) ) {
			$redirect_url = defined( 'PAYMENT_PROCESSOR_URL' ) ? PAYMENT_PROCESSOR_URL : get_option( $this->option_prefix . 'payment_processor_url', '' );
			$error_url    = isset( $_POST['current_url'] ) ? filter_var( $_POST['current_url'], FILTER_SANITIZE_URL ) : '';
			if ( '' !== $redirect_url ) {

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

				// sanitize form data we accept
				$post_params = $this->process_parameters( 'post' );
				$params      = array_merge( $params, $post_params );

				// different buttons might have been clicked if it was a level picker

				$member_levels = $this->member_levels->get_member_levels();
				foreach ( $member_levels as $key => $value ) {
					$level_number = $key + 1;
					if ( isset( $_POST[ 'membership-submit-' . $level_number ] ) ) {
						$params['amount']    = filter_var( $_POST[ 'amount-level-' . $level_number ], FILTER_SANITIZE_NUMBER_INT );
						$params['frequency'] = $this->process_frequency_value( $_POST[ 'membership-frequency-' . $level_number ] );
						continue;
					}
				}

				// if we're on a page without a level picker, the frequency is one field
				if ( isset( $_POST['frequencies'] ) ) {
					$params['frequency'] = $this->process_frequency_value( $_POST['frequencies'] );
				}

				// send the valid form data to the payment processor as url parameters
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

			} else {
				exit;
			}
		}
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

		if ( 0 === $user_id ) {
			return $post_form_text_display;
		}

		$user_member_level = $this->user_info->user_member_level( $user_id );

		$page_level_slug = $this->member_levels->calculate_level( $page_amount, $frequency['value'], 'value', $amount_this_year );
		$page_level      = $this->member_levels->get_member_levels( $page_level_slug, true, 'slug' );

		$post_form_text_default = get_option( $this->option_prefix . 'support_post_form_nonmembers', '' );
		$post_form_text_default = str_replace( '$level', '<strong>' . get_bloginfo( 'name' ) . ' <span class="a-level">' . $page_level['name'] . '</span></strong>', $post_form_text_default );

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
				$url_params = $this->process_parameters( 'get' );
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
				$url_params = $this->process_parameters( 'get' );
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
					$url_params = $this->process_parameters( 'get' );
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

		$payment_urls        = get_option( $this->option_prefix . 'payment_urls', '' );
		$member_benefit_urls = get_option( $this->option_prefix . 'member_benefit_urls', '' );

		$all_urls  = '';
		$all_urls .= $payment_urls;
		$all_urls .= "\r\n" . $member_benefit_urls;
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
			wp_enqueue_script( $this->slug . '-front-end', plugins_url( '../assets/js/' . $this->slug . '-front-end.min.js', __FILE__ ), array( 'jquery' ), $this->version, true );
			$minnpost_membership_data = $this->get_user_membership_info();
			wp_localize_script( $this->slug . '-front-end', 'minnpost_membership_data', $minnpost_membership_data );
			wp_add_inline_script( $this->slug . '-front-end', "
				jQuery(document).ready(function ($) {
					$('.m-form-membership').minnpostMembership();
				});" );
		}
		if ( true !== filter_var( $disable_css, FILTER_VALIDATE_BOOLEAN ) ) {
			wp_enqueue_style( $this->slug . '-front-end', plugins_url( '../assets/css/' . $this->slug . '-front-end.min.css', __FILE__ ), array(), $this->version, 'all' );
		}
	}

	/**
	* Get the current user's membership information
	*
	* @return array $user_membership_info
	*/
	public function get_user_membership_info() {
		$user_membership_info = array(
			'member_level_prefix' => $this->member_levels->member_level_prefix,
			'current_user'        => $this->user_info->user_membership_info( get_current_user_id() ),
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
			$user_state = $this->user_info->get_user_state( '', $path );
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
	 * Finds and returns a matching error message for the given error code.
	 *
	 * @param string $error_code    The error code to look up.
	 * @param array $data           This should be user data, either provided by a form or a hook
	 *
	 * @return string               An error message.
	 */
	public function get_error_message( $error_code, $data = array() ) {
		$error_code     = filter_var( $error_code, FILTER_SANITIZE_STRING );
		$custom_message = apply_filters( 'minnpost_membership_custom_error_message', '', $error_code, $data );
		if ( '' !== $custom_message ) {
			return $custom_message;
		}
		// example to change the error message
		/*
		add_filter( 'minnpost_membership_custom_error_message', 'error_message', 10, 3 );
		function error_message( $message, $error_code, $data ) {
			$message = 'this is my error';
			return $message;
		}
		*/
		switch ( $error_code ) {
			case 'empty_amount':
				return __( 'You did not enter an amount.', 'minnpost-membership' );
			case 'invalid_amount':
				return __( 'You entered an invalid amount.', 'minnpost-membership' );
			default:
				return __( 'We were unable to send your information to start our payment processor. Try again.', 'minnpost-membership' );
		}
		return __( 'An unknown error occurred. Please try again later.', 'minnpost-membership' );
	}

}
