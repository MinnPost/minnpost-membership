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
	protected $cache;

	/**
	* Constructor which sets up front end
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
		add_action( 'pre_get_posts', array( $this, 'set_query_properties' ), 10 );
		add_filter( 'init', array( $this, 'cortex_routes' ) );
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

		$payment_urls = get_option( $this->option_prefix . 'payment_urls', '' );

		$all_urls  = '';
		$all_urls .= $payment_urls;
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
	* Front end styles. Load the CSS and/or JavaScript
	*
	* @return void
	*/
	public function front_end_scripts_and_styles() {
		// we need to make this themeable, i think
		$disable_javascript = get_option( $this->option_prefix . 'disable_javascript', false );
		$disable_css        = get_option( $this->option_prefix . 'disable_css', false );
		if ( '1' !== $disable_javascript ) {
			wp_enqueue_script( $this->slug . '-front-end', plugins_url( '../assets/js/' . $this->slug . '-front-end.min.js', __FILE__ ), array( 'jquery' ), $this->version, true );
			/*$minnpost_membership_data = array(
				'current_user' => array( $this, 'get_user_membership_info' ),
			);
			wp_localize_script( $this->slug . '-front-end', 'minnpost_membership_data', $minnpost_membership_data );*/
			wp_add_inline_script( $this->slug . '-front-end', "
				jQuery(document).ready(function ($) {
					$('.m-form-membership-member-levels').minnpost_membership({
						'debug' : false
					});
				});" );
		}
		if ( '1' !== $disable_css ) {
			wp_enqueue_style( $this->slug . '-front-end', plugins_url( '../assets/css/' . $this->slug . '-front-end.min.css', __FILE__ ), array(), $this->version, 'all' );
		}
	}

}
