<?php

/**
 * The main plugin class
 *
 * @package MinnPost_Membership
 */

class MinnPost_Membership {

	/**
	* @var string
	* The plugin version
	*/
	public $version;

	/**
	 * Filesystem path to the main plugin file
	 * @var string
	 */
	public $file;

	/**
	* @var string
	* The plugin's slug
	*/
	public $slug;

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
	 * This is our constructor
	 *
	 * @return void
	 */
	public function __construct( $version, $file ) {

		$this->version       = $version;
		$this->file          = $file;
		$this->slug          = 'minnpost-membership';
		$this->option_prefix = 'minnpost_membership_';

		$this->add_actions();

	}

	/**
	* Do actions
	*
	*/
	private function add_actions() {
		add_action( 'plugins_loaded', array( $this, 'load_textdomain' ) );
		register_activation_hook( __FILE__, array( $this, 'activate' ) );
		register_deactivation_hook( __FILE__, array( $this, 'deactivate' ) );
	}

	public function init() {
		$this->cache         = new MinnPost_Membership_Cache();
		$this->member_levels = new MinnPost_Membership_Member_Level();
		$this->user_info     = new MinnPost_Membership_User_Info();
		$this->content_items = new MinnPost_Membership_Content_Items();
		$this->admin         = new MinnPost_Membership_Admin();
		$this->front_end     = new MinnPost_Membership_Front_End();
		$this->shortcodes    = new MinnPost_Membership_Shortcodes();
	}

	/**
	 * Load up the localization file if we're using WordPress in a different language.
	 *
	 */
	public function load_textdomain() {
		load_plugin_textdomain( 'minnpost-membership', false, dirname( plugin_basename( $this->file ) ) . '/languages/' );
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

}
