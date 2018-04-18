<?php
/**
 * Class file for the MinnPost_Membership_Front_End class.
 *
 * @file
 */

if ( ! class_exists( 'MinnPost_Membership' ) ) {
	die();
}

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

	}

	/**
	* Create the action hooks to create front end things
	*
	*/
	public function add_actions() {
		if ( ! is_admin() ) {
			add_action( 'wp_enqueue_scripts', array( $this, 'front_end_scripts_and_styles' ) );
			add_action( 'init', array( $this, 'rewrite_rules' ) );
			add_action( 'template_include', array( $this, 'include_template' ) );
			add_filter( 'request', array( $this, 'membership_urls' ) );
		}

	}

	public function rewrite_rules() {
		//add_rewrite_endpoint( 'support', EP_ROOT );
		add_rewrite_rule( 'support/(.+?)/?$', 'index.php?support_page=$matches[1]', 'top' );
		add_rewrite_tag( '%support_page%', '([^&]+)' );
	}

	public function membership_urls( $vars = array() ) {
		if ( isset( $vars['category_name'] ) && 'support' === $vars['category_name'] ) {
			$vars['support_page'] = 'default';
		} elseif ( isset( $vars['category_name'] ) ) {
			$first  = substr( $vars['category_name'] . '/', 0, strpos( $vars['category_name'], '/' ) );
			$second = substr( $vars['category_name'], strrpos( $vars['category_name'], '/' ) + 1 );
			if ( 'support' === $first ) {
				$vars['support_page'] = $second;
			}
		}

		return $vars;
	}

	public function include_template( $template ) {
		//try and get the query var we registered in our query_vars() function
		$support_page = get_query_var( 'support_page' );
		// if the query var has data, we must be on the right page, load our custom template
		if ( $support_page ) {
			if ( 'default' === $support_page ) {
				$template_name = 'support';
			} else {
				$template_name = 'support-' . $support_page;
			}

			// Render the template
			echo $this->get_template_html( $template_name, 'front-end' );
		}

		return $template;
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

}
