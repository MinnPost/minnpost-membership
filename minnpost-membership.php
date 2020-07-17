<?php
/*
Plugin Name: MinnPost Membership
Description: This plugin manages various parts of MinnPost's membership UX.
Version: 0.0.12
Author: Jonathan Stegall
Author URI: https://code.minnpost.com
Text Domain: minnpost-membership
License: GPL2+
License URI: https://www.gnu.org/licenses/gpl-2.0.html
*/

class MinnPost_Membership {

	/**
	* @var string
	* The plugin version
	*/
	private $version;

	/**
	* @var string
	* The plugin's slug
	*/
	protected $slug;

	/**
	* @var string
	* The plugin's prefix for saving options
	*/
	public $option_prefix;

	/**
	* @var object
	* Load and initialize the MinnPost_Membership_Cache class
	*/
	public $cache;

	/**
	* @var object
	* Load and initialize the MinnPost_Membership_Member_Level class
	*/
	public $member_levels;

	/**
	* @var object
	* Load and initialize the MinnPost_Membership_User_Info class
	*/
	public $user_info;

	/**
	* @var object
	* Load and initialize the MinnPost_Membership_Content_Items class
	*/
	public $content_items;

	/**
	* @var object
	* Load and initialize the MinnPost_Membership_Admin class
	*/
	public $admin;

	/**
	* @var object
	* Load and initialize the MinnPost_Membership_Front_End class
	*/
	public $front_end;

	/**
	* @var object
	* Load and initialize the MinnPost_Membership_Shortcodes class
	*/
	public $shortcodes;

	/**
	 * @var object
	 * Static property to hold an instance of the class; this seems to make it reusable
	 *
	 */
	static $instance = null;

	/**
	* Load the static $instance property that holds the instance of the class.
	* This instance makes the class reusable by other plugins
	*
	* @return object
	*
	*/
	static public function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new MinnPost_Membership();
		}
		return self::$instance;
	}

	/**
	 * This is our constructor
	 *
	 * @return void
	 */
	public function __construct() {

		$this->version       = '0.0.12';
		$this->slug          = 'minnpost-membership';
		$this->option_prefix = 'minnpost_membership_';

		// wp cache settings
		$this->cache = $this->cache();
		// member levels
		$this->member_levels = $this->member_levels();
		// user info for membership
		$this->user_info = $this->user_info();
		// content items
		$this->content_items = $this->content_items();
		// admin settings
		$this->admin = $this->admin();
		// front end settings
		$this->front_end = $this->front_end();
		// shortcode settings
		$this->shortcodes = $this->shortcodes();

		$this->add_actions();

	}

	/**
	* Do actions
	*
	*/
	private function add_actions() {
		add_action( 'plugins_loaded', array( $this, 'textdomain' ) );
		register_activation_hook( __FILE__, array( $this, 'activate' ) );
		register_deactivation_hook( __FILE__, array( $this, 'deactivate' ) );
	}

	/**
	 * Plugin cache
	 *
	 * @return object $cache
	 */
	public function cache() {
		require_once( plugin_dir_path( __FILE__ ) . 'classes/class-minnpost-membership-cache.php' );
		$cache = new MinnPost_Membership_Cache( $this->option_prefix, $this->version, $this->slug );
		return $cache;
	}

	/**
	 * Member levels
	 *
	 * @return object $member_levels
	 */
	public function member_levels() {
		require_once( plugin_dir_path( __FILE__ ) . 'classes/class-minnpost-membership-member-level.php' );
		$member_levels = new MinnPost_Membership_Member_Level( $this->option_prefix, $this->version, $this->slug, $this->cache );
		return $member_levels;
	}

	/**
	 * User information
	 *
	 * @return object $user_info
	 */
	public function user_info() {
		require_once( plugin_dir_path( __FILE__ ) . 'classes/class-minnpost-membership-user-info.php' );
		$user_info = new MinnPost_Membership_User_Info( $this->option_prefix, $this->version, $this->slug, $this->member_levels, $this->cache );
		return $user_info;
	}

	/**
	 * Plugin content items
	 *
	 * @return object $content_items
	 */
	public function content_items() {
		require_once( plugin_dir_path( __FILE__ ) . 'classes/class-minnpost-membership-content-items.php' );
		$content_items = new MinnPost_Membership_Content_Items( $this->option_prefix, $this->version, $this->slug, $this->member_levels, $this->user_info, $this->cache );
		return $content_items;
	}

	/**
	 * Plugin admin
	 *
	 * @return object $admin
	 */
	public function admin() {
		require_once( plugin_dir_path( __FILE__ ) . 'classes/class-minnpost-membership-admin.php' );
		$admin = new MinnPost_Membership_Admin( $this->option_prefix, $this->version, $this->slug, $this->member_levels, $this->user_info, $this->content_items, $this->cache );
		add_filter( 'plugin_action_links', array( $this, 'plugin_action_links' ), 10, 2 );
		return $admin;
	}

	/**
	 * Plugin front end
	 *
	 * @return object $front_end
	 */
	public function front_end() {
		require_once( plugin_dir_path( __FILE__ ) . 'classes/class-minnpost-membership-front-end.php' );
		$front_end = new MinnPost_Membership_Front_End( $this->option_prefix, $this->version, $this->slug, $this->member_levels, $this->user_info, $this->content_items, $this->cache );
		return $front_end;
	}

	/**
	 * Plugin shortcodes
	 *
	 * @return object $shortcodes
	 */
	public function shortcodes() {
		require_once( plugin_dir_path( __FILE__ ) . 'classes/class-minnpost-membership-shortcodes.php' );
		$shortcodes = new MinnPost_Membership_Shortcodes( $this->option_prefix, $this->version, $this->slug, $this->member_levels, $this->user_info, $this->content_items, $this->cache );
		return $shortcodes;
	}

	/**
	 * Load textdomain
	 *
	 * @return void
	 */
	public function textdomain() {
		load_plugin_textdomain( 'minnpost-membership', false, dirname( plugin_basename( __FILE__ ) ) . '/languages/' );
	}

	/**
	 * Activate plugin
	 *
	 * @return void
	 */
	public function activate() {
		// by default, only administrators can configure the plugin
		$role = get_role( 'administrator' );
		$role->add_cap( 'manage_minnpost_membership_options' );
		flush_rewrite_rules();
	}

	/**
	 * Deactivate plugin
	 *
	 * @return void
	 */
	public function deactivate() {
		flush_rewrite_rules();
	}

	/**
	* Display a Settings link on the main Plugins page
	*
	* @param array $links
	* @param string $file
	* @return array $links
	* These are the links that go with this plugin's entry
	*/
	public function plugin_action_links( $links, $file ) {
		if ( plugin_basename( __FILE__ ) === $file ) {
			$settings = '<a href="' . get_admin_url() . 'admin.php?page=' . $this->slug . '">' . __( 'Settings', 'minnpost-membership' ) . '</a>';
			array_unshift( $links, $settings );
		}
		return $links;
	}

}

// Instantiate our class
$minnpost_membership = MinnPost_Membership::get_instance();
