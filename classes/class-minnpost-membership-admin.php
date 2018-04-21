<?php
/**
 * Class file for the MinnPost_Membership_Admin class.
 *
 * @file
 */

if ( ! class_exists( 'MinnPost_Membership' ) ) {
	die();
}

/**
 * Create default WordPress admin functionality to configure the plugin.
 */
class MinnPost_Membership_Admin {

	protected $option_prefix;
	protected $version;
	protected $slug;
	protected $member_levels;
	protected $cache;

	/**
	* Constructor which sets up admin pages
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

		$this->pages = $this->get_admin_pages();

		$this->mp_mem_transients = $this->cache->mp_mem_transients;

		$this->add_actions();

	}

	/**
	* Create the action hooks to create the admin page(s)
	*
	*/
	public function add_actions() {
		if ( is_admin() ) {
			add_action( 'admin_menu', array( $this, 'create_admin_menu' ) );
			add_action( 'admin_init', array( $this, 'admin_settings_form' ) );
			add_action( 'admin_enqueue_scripts', array( $this, 'admin_scripts_and_styles' ) );
			add_action( 'admin_post_post_member_level', array( $this, 'prepare_member_level_data' ) );
			add_action( 'admin_post_delete_member_level', array( $this, 'delete_member_level' ) );
		}

	}

	/**
	* Create WordPress admin options page
	*
	*/
	public function create_admin_menu() {
		$capability = 'manage_options';
		add_menu_page( __( 'MinnPost Membership', 'minnpost-membership' ), __( 'Membership', 'minnpost-membership' ), $capability, $this->slug, array( $this, 'show_admin_page' ), 'dashicons-groups' );
		$pages = $this->get_admin_pages();
		foreach ( $pages as $key => $value ) {
			add_submenu_page( $this->slug, $value['title'], $value['title'], $capability, $key, array( $this, 'show_admin_page' ) );
		}
		// Remove the default page called Membership because that's annoying
		remove_submenu_page( $this->slug, $this->slug );
	}

	/**
	* Create WordPress admin options menu pages
	*
	* @return array $pages
	*
	*/
	private function get_admin_pages() {
		$pages = array(
			$this->slug . '-settings'           => array(
				'title'    => __( 'General Settings', 'minnpost-membership' ),
				'sections' => array(
					'member_levels' => __( 'Member levels', 'minnpost-membership' ),
					'more_settings' => __( 'More settings', 'minnpost-membership' ),
				),
				'use_tabs' => false,
			),
			$this->slug . '-taking-payments'    => array(
				'title'    => __( 'Taking Payments', 'minnpost-membership' ),
				'sections' => $this->setup_payment_page_sections(),
				'use_tabs' => true,
			),
			$this->slug . '-benefits'           => array(
				'title'    => __( 'Member Benefits', 'minnpost-membership' ),
				'sections' => array(),
				'use_tabs' => false,
			),
			$this->slug . '-member-drive'       => array(
				'title'    => __( 'Member Drive', 'minnpost-membership' ),
				'sections' => array(),
				'use_tabs' => false,
			),
			$this->slug . '-premium-content'    => array(
				'title'    => __( 'Premium Content', 'minnpost-membership' ),
				'sections' => array(),
				'use_tabs' => false,
			),
			$this->slug . '-site-notifications' => array(
				'title'    => __( 'Site Notifications', 'minnpost-membership' ),
				'sections' => array(),
				'use_tabs' => false,
			),
		); // this creates the pages for the admin
		return $pages;
	}

	/**
	* Display the admin settings page
	*
	* @return void
	*/
	public function show_admin_page() {
		$get_data = filter_input_array( INPUT_GET, FILTER_SANITIZE_STRING );
		?>
		<div class="wrap">
			<h1><?php _e( get_admin_page_title(), 'minnpost-membership' ); ?></h1>
			<?php
			$page    = isset( $get_data['page'] ) ? sanitize_key( $get_data['page'] ) : $this->slug . '-settings';
			$tab     = isset( $get_data['tab'] ) ? sanitize_key( $get_data['tab'] ) : $page;
			$section = $tab;
			$tabs    = $this->pages[ $page ]['sections'];
			if ( ! empty( $tabs ) && true === $this->pages[ $page ]['use_tabs'] ) {

				if ( isset( $get_data['tab'] ) ) {
					$tab = sanitize_key( $get_data['tab'] );
				} else {
					reset( $tabs );
					$tab = key( $tabs );
				}
				$this->render_tabs( $page, $tabs, $tab );
			}
			switch ( $tab ) {
				case $this->slug . '-settings':
					if ( isset( $get_data['method'] ) ) {
						$method      = sanitize_key( $get_data['method'] );
						$error_url   = get_admin_url( null, 'admin.php?page=' . $page . '&method=' . $method );
						$success_url = get_admin_url( null, 'admin.php?page=' . $page );

						if ( isset( $get_data['transient'] ) ) {
							$transient = sanitize_key( $get_data['transient'] );
							$posted    = $this->mp_mem_transients->get( $transient );
						}

						if ( isset( $posted ) && is_array( $posted ) ) {
							$member_level = $posted;
							$id           = $member_level['id'];
						} elseif ( 'edit-member-level' === $method || 'delete-member-level' === $method ) {
							$id           = $get_data['id'];
							$member_level = $this->member_levels->get_member_levels( isset( $id ) ? sanitize_key( $id ) : '' );
						}

						if ( isset( $member_level ) && is_array( $member_level ) ) {
							$name                   = $member_level['name'];
							$is_nonmember           = isset( $member_level['is_nonmember'] ) ? intval( $member_level['is_nonmember'] ) : '';
							$minimum_monthly_amount = $member_level['minimum_monthly_amount'];
							$maximum_monthly_amount = $member_level['maximum_monthly_amount'];
							$starting_value         = $member_level['starting_value'];
							$benefits               = $member_level['benefits'];
						}

						if ( 'add-member-level' === $method || 'edit-member-level' === $method ) {
							require_once( plugin_dir_path( __FILE__ ) . '/../templates/admin/member-levels-add-edit.php' );
						} elseif ( 'delete-member-level' === $method ) {
							require_once( plugin_dir_path( __FILE__ ) . '/../templates/admin/member-levels-delete.php' );
						}
					} else {
						$member_levels = $this->member_levels->get_member_levels();
						require_once( plugin_dir_path( __FILE__ ) . '/../templates/admin/general-settings.php' );
					}
					break;
				case 'allowed_resources':
					require_once( plugin_dir_path( __FILE__ ) . '/../templates/admin/settings.php' );
					break;
				case 'resource_settings':
					require_once( plugin_dir_path( __FILE__ ) . '/../templates/admin/settings.php' );
					break;
				case 'subresource_settings':
					require_once( plugin_dir_path( __FILE__ ) . '/../templates/admin/settings.php' );
					break;
				default:
					require_once( plugin_dir_path( __FILE__ ) . '/../templates/admin/settings.php' );
					break;
			} // End switch().*/
			?>

		</div>
		<?php
	}

	/**
	* Render tabs for settings pages in admin
	* @param string $page
	* @param array $tabs
	* @param string $tab
	*/
	private function render_tabs( $page, $tabs, $tab = 'default' ) {
		$get_data = filter_input_array( INPUT_GET, FILTER_SANITIZE_STRING );

		$current_tab = $tab;
		echo '<h2 class="nav-tab-wrapper">';
		foreach ( $tabs as $tab_key => $tab_caption ) {
			$active = $current_tab === $tab_key ? ' nav-tab-active' : '';
			echo sprintf( '<a class="nav-tab%1$s" href="%2$s">%3$s</a>',
				esc_attr( $active ),
				esc_url( '?page=' . $page . '&tab=' . $tab_key ),
				esc_html( $tab_caption )
			);

		}
		echo '</h2>';

		if ( isset( $get_data['tab'] ) ) {
			$tab = sanitize_key( $get_data['tab'] );
		}
	}

	/**
	* Register items for the settings api
	* @return void
	*
	*/
	public function admin_settings_form() {

		$get_data = filter_input_array( INPUT_GET, FILTER_SANITIZE_STRING );
		$page     = isset( $get_data['page'] ) ? sanitize_key( $get_data['page'] ) : $this->slug . '-settings';
		if ( false === strpos( $page, $this->slug ) ) {
			return;
		}
		$tab     = isset( $get_data['tab'] ) ? sanitize_key( $get_data['tab'] ) : $page;
		$section = $tab;

		$input_callback_default   = array( $this, 'display_input_field' );
		$input_checkboxes_default = array( $this, 'display_checkboxes' );
		$input_select_default     = array( $this, 'display_select' );
		$textarea_default         = array( $this, 'display_textarea' );
		$editor_default           = array( $this, 'display_editor' );
		$link_default             = array( $this, 'display_link' );

		$all_field_callbacks = array(
			'text'       => $input_callback_default,
			'checkboxes' => $input_checkboxes_default,
			'select'     => $input_select_default,
			'textarea'   => $textarea_default,
			'editor'     => $editor_default,
			'link'       => $link_default,
		);

		$this->general_settings( $page, $all_field_callbacks );
		$this->member_finances( $page, $all_field_callbacks );
		//$this->allowed_resources( 'allowed_resources', 'allowed_resources', $all_field_callbacks );
		//$this->resource_settings( 'resource_settings', 'resource_settings', $all_field_callbacks );
		//$this->subresource_settings( 'subresource_settings', 'subresource_settings', $all_field_callbacks );

	}

	/**
	* Admin styles. Load the CSS and/or JavaScript for the plugin's settings
	*
	* @return void
	*/
	public function admin_scripts_and_styles() {
		wp_enqueue_script( $this->slug . '-front-end', plugins_url( '../assets/js/' . $this->slug . '-front-end.min.js', __FILE__ ), array( 'jquery' ), $this->version, true );
		wp_enqueue_script( $this->slug . '-admin', plugins_url( '../assets/js/' . $this->slug . '-admin.min.js', __FILE__ ), array( 'jquery', $this->slug . '-front-end' ), $this->version, true );
		wp_enqueue_style( $this->slug . '-admin', plugins_url( '../assets/css/' . $this->slug . '-admin.min.css', __FILE__ ), array(), $this->version, 'all' );
	}

	/**
	* Fields for the General Settings page
	* This runs add_settings_section once, as well as add_settings_field and register_setting methods for each option
	*
	* @param string $page
	* @param array $callbacks
	*/
	private function general_settings( $page, $callbacks ) {
		$sections = $this->get_admin_pages()[ $page ]['sections'];
		if ( ! empty( $sections ) ) {
			foreach ( $sections as $key => $value ) {
				//if ( $key === $page ) {
				//	$title = $value;
				//}
				//$section = $key;
				//echo 'section is ' . $section;
				$section = $key;
				$title   = $value;
				add_settings_section( $section, $title, null, $page );
			}
		} else {
			$section = $page;
			$title   = $this->get_admin_pages()[ $page ]['title'];
			add_settings_section( $section, $title, null, $page );
		}

		$settings = array(
			'use_member_levels'  => array(
				'title'    => __( 'Use member levels?', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $page,
				'section'  => 'member_levels',
				'args'     => array(
					'type'     => 'checkbox',
					'desc'     => '',
					'constant' => '',
				),
			),
			'frequency_options'  => array(
				'title'    => __( 'Frequency options', 'minnpost-membership' ),
				'callback' => $callbacks['checkboxes'],
				'page'     => $page,
				'section'  => 'member_levels',
				'args'     => array(
					'type'     => 'select',
					'desc'     => '',
					'constant' => '',
					'items'    => $this->member_levels->get_frequency_options(),
				),
			),
			'disable_javascript' => array(
				'title'    => __( 'Disable plugin JavaScript?', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $page,
				'section'  => 'more_settings',
				'args'     => array(
					'type'     => 'checkbox',
					'desc'     => 'Checking this will keep the plugin from adding its JavaScript to the front end interface.',
					'constant' => '',
				),
			),
			'disable_css'        => array(
				'title'    => __( 'Disable plugin CSS?', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $page,
				'section'  => 'more_settings',
				'args'     => array(
					'type'     => 'checkbox',
					'desc'     => 'Checking this will keep the plugin from adding its stylesheet to the front end interface.',
					'constant' => '',
				),
			),
		);

		$frequency_options = get_option( $this->option_prefix . 'frequency_options', array() );
		if ( ! empty( $frequency_options ) ) {

			$options = array();
			foreach ( $frequency_options as $key ) {
				$options[ $key ] = $this->member_levels->get_frequency_options( $key );
			}

			$settings['default_frequency'] = array(
				'title'    => __( 'Default frequency', 'minnpost-membership' ),
				'callback' => $callbacks['checkboxes'],
				'page'     => $page,
				'section'  => 'member_levels',
				'args'     => array(
					'type'     => 'radio',
					'desc'     => '',
					'constant' => '',
					'items'    => $options,
				),
			);
		}

		foreach ( $settings as $key => $attributes ) {
			$id       = $this->option_prefix . $key;
			$name     = $this->option_prefix . $key;
			$title    = $attributes['title'];
			$callback = $attributes['callback'];
			$page     = $attributes['page'];
			$section  = $attributes['section'];
			$args     = array_merge(
				$attributes['args'],
				array(
					'title'     => $title,
					'id'        => $id,
					'label_for' => $id,
					'name'      => $name,
					'class'     => 'minnpost-member-field ' . $id,
				)
			);

			// if there is a constant and it is defined, don't run a validate function if there is one
			if ( isset( $attributes['args']['constant'] ) && defined( $attributes['args']['constant'] ) ) {
				$validate = '';
			}
			add_settings_field( $id, $title, $callback, $page, $section, $args );
			register_setting( $section, $id );
		}
	}

	/**
	* Fields for the Member Finances page
	* This runs add_settings_section once, as well as add_settings_field and register_setting methods for each option
	*
	* @param string $page
	* @param array $callbacks
	*/
	private function member_finances( $page, $callbacks ) {
		$sections = $this->get_admin_pages()[ $page ]['sections'];
		if ( ! empty( $sections ) ) {
			foreach ( $sections as $key => $value ) {
				$section = $key;
				$title   = $value;
				$page    = $section;
				add_settings_section( $section, $title, null, $page );
			}
		} else {
			$section = $page;
			$title   = $this->get_admin_pages()[ $page ]['title'];
			add_settings_section( $section, $title, null, $page );
		}

		$settings = array(
			'payment_urls' => array(
				'title'    => __( 'Payment URLs', 'minnpost-membership' ),
				'callback' => $callbacks['textarea'],
				'page'     => 'pages',
				'section'  => 'pages',
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'rows'     => 5,
					'cols'     => '',
				),
			),
		);

		$payment_sections = $this->setup_payment_page_sections();
		if ( ! empty( $payment_sections ) ) {
			foreach ( $payment_sections as $key => $value ) {
				$section = $key;
				$title   = $value;
				$page    = $section;
				add_settings_section( $section, $title, null, $page );
			}
		}

		$settings['support_title'] = array(
			'title'    => __( 'Page title', 'minnpost-membership' ),
			'callback' => $callbacks['text'],
			'page'     => 'support',
			'section'  => 'support',
			'args'     => array(
				'desc'     => '',
				'constant' => '',
				'type'     => 'text',
			),
		);

		$settings['support-member-benefits_title'] = array(
			'title'    => __( 'Page title', 'minnpost-membership' ),
			'callback' => $callbacks['text'],
			'page'     => 'member-benefits',
			'section'  => 'member-benefits',
			'args'     => array(
				'desc'     => '',
				'constant' => '',
				'type'     => 'text',
			),
		);

		$settings['support-member-benefits_pre_form_text'] = array(
			'title'    => __( 'Pre-form text', 'minnpost-membership' ),
			'callback' => $callbacks['text'],
			'page'     => 'member-benefits',
			'section'  => 'member-benefits',
			'args'     => array(
				'desc'     => '',
				'constant' => '',
				'type'     => 'text',
			),
		);

		/*$settings['support-member-benefits_post_form_text'] = array(
			'title'    => __( 'Post-form text', 'minnpost-membership' ),
			'callback' => $callbacks['text'],
			'page'     => 'member-benefits',
			'section'  => 'member-benefits',
			'args'     => array(
				'desc'     => '',
				'constant' => '',
				'type'     => 'text',
			),
		);

		$settings['support-member-benefits_post_form_text_link'] = array(
			'title'    => __( 'Post-form text link', 'minnpost-membership' ),
			'callback' => $callbacks['text'],
			'page'     => 'member-benefits',
			'section'  => 'member-benefits',
			'args'     => array(
				'desc'     => '',
				'constant' => '',
				'type'     => 'text',
			),
		);*/

		$settings['support-member-benefits_default_level'] = array(
			'title'    => __( 'Default level', 'minnpost-membership' ),
			'callback' => $callbacks['select'],
			'page'     => 'member-benefits',
			'section'  => 'member-benefits',
			'args'     => array(
				'type'     => 'select',
				'desc'     => '',
				'constant' => '',
				'items'    => $this->get_member_level_options(),
			),
		);

		$settings['support-member-benefits_level_button_text'] = array(
			'title'    => __( 'Level button text', 'minnpost-membership' ),
			'callback' => $callbacks['text'],
			'page'     => 'member-benefits',
			'section'  => 'member-benefits',
			'args'     => array(
				'desc'     => '',
				'constant' => '',
				'type'     => 'text',
			),
		);

		$settings['support-member-benefits_give_button_text'] = array(
			'title'    => __( 'Give button text', 'minnpost-membership' ),
			'callback' => $callbacks['text'],
			'page'     => 'member-benefits',
			'section'  => 'member-benefits',
			'args'     => array(
				'desc'     => '',
				'constant' => '',
				'type'     => 'text',
			),
		);

		$settings['support-member-benefits_post_body_text'] = array(
			'title'    => __( 'Post body text', 'minnpost-membership' ),
			'callback' => $callbacks['textarea'],
			'page'     => 'member-benefits',
			'section'  => 'member-benefits',
			'args'     => array(
				'desc'     => '',
				'constant' => '',
				'type'     => 'text',
				'rows'     => 5,
				'cols'     => '',
			),
		);

		$settings['support-member-benefits_post_body_link_url'] = array(
			'title'    => __( 'Post body link URL', 'minnpost-membership' ),
			'callback' => $callbacks['text'],
			'page'     => 'member-benefits',
			'section'  => 'member-benefits',
			'args'     => array(
				'desc'     => '',
				'constant' => '',
				'type'     => 'text',
			),
		);

		$settings['support-member-benefits_post_body_link_fragment'] = array(
			'title'    => __( 'Post body link fragment', 'minnpost-membership' ),
			'callback' => $callbacks['text'],
			'page'     => 'member-benefits',
			'section'  => 'member-benefits',
			'args'     => array(
				'desc'     => '',
				'constant' => '',
				'type'     => 'text',
			),
		);

		$settings['support-member-benefits_post_body_link_class'] = array(
			'title'    => __( 'Post body link class', 'minnpost-membership' ),
			'callback' => $callbacks['text'],
			'page'     => 'member-benefits',
			'section'  => 'member-benefits',
			'args'     => array(
				'desc'     => '',
				'constant' => '',
				'type'     => 'text',
			),
		);

		$settings['support-member-benefits_post_body_link_text'] = array(
			'title'    => __( 'Post body link text', 'minnpost-membership' ),
			'callback' => $callbacks['text'],
			'page'     => 'member-benefits',
			'section'  => 'member-benefits',
			'args'     => array(
				'desc'     => '',
				'constant' => '',
				'type'     => 'text',
			),
		);

		$settings['support-member-benefits_post_body_show_member_details_link'] = array(
			'title'    => __( 'Show link to member benefit details page?', 'minnpost-membership' ),
			'callback' => $callbacks['text'],
			'page'     => 'member-benefits',
			'section'  => 'member-benefits',
			'args'     => array(
				'desc'     => '',
				'constant' => '',
				'type'     => 'checkbox',
			),
		);

		foreach ( $settings as $key => $attributes ) {
			$id       = $this->option_prefix . $key;
			$name     = $this->option_prefix . $key;
			$title    = $attributes['title'];
			$callback = $attributes['callback'];
			$page     = $attributes['page'];
			$section  = $attributes['section'];
			$args     = array_merge(
				$attributes['args'],
				array(
					'title'     => $title,
					'id'        => $id,
					'label_for' => $id,
					'name'      => $name,
					'class'     => 'minnpost-member-field ' . $id,
				)
			);

			// if there is a constant and it is defined, don't run a validate function if there is one
			if ( isset( $attributes['args']['constant'] ) && defined( $attributes['args']['constant'] ) ) {
				$validate = '';
			}
			add_settings_field( $id, $title, $callback, $page, $section, $args );
			register_setting( $section, $id );
		}
	}

	/**
	* Set up options tab for each payment page URL in the options
	*
	* @return $array $sections
	*
	*/
	private function setup_payment_page_sections() {
		$sections = array(
			'pages' => __( 'Payment Pages', 'minnpost-membership' ),
		);

		$urls = get_option( $this->option_prefix . 'payment_urls', array() );
		if ( ! empty( $urls ) ) {
			$urls = explode( "\r\n", $urls );
			foreach ( $urls as $url ) {
				$url       = ltrim( $url, '/' );
				$url_array = explode( '/', $url );
				if ( isset( $url_array[1] ) ) {
					$url = $url_array[1];
				}
				$title = ucwords( str_replace( '-', ' ', $url ) );

				$sections[ $url ] = $title;
			}
		}

		return $sections;
	}

	/**
	* Setting options for picking a member level
	* @return array $options
	*
	*/
	private function get_member_level_options() {
		$member_levels = $this->member_levels->get_member_levels();
		$options       = array();
		foreach ( $member_levels as $member_level ) {
			$options[] = array(
				'id'      => $member_level['slug'],
				'value'   => $member_level['slug'],
				'text'    => $member_level['name'],
				'desc'    => '',
				'default' => '',
			);
		}
		return $options;
	}

	/**
	* Prepare member level data and redirect after processing
	* This runs when the create or update forms are submitted
	* It is public because it depends on an admin hook
	* It then calls the MinnPost_Membership_Member_Level class and sends prepared data over to it, then redirects to the correct page
	* This method does include error handling, by loading the submission in a transient if there is an error, and then deleting it upon success
	*
	*/
	public function prepare_member_level_data() {
		$error     = false;
		$post_data = $_POST;
		$cachekey  = md5( wp_json_encode( $post_data ) );

		if ( ! isset( $post_data['name'] ) || ! isset( $post_data['benefits'] ) ) {
			$error = true;
		}

		if ( true === $error ) {
			$this->mp_mem_transients->set( $cachekey, $post_data );
			if ( '' !== $cachekey ) {
				$url = esc_url_raw( $post_data['redirect_url_error'] ) . '&transient=' . $cachekey;
			}
		} else { // there are no errors
			// send the row to the fieldmap class
			// if it is add or clone, use the create method
			$method = esc_attr( $post_data['method'] );
			if ( 'add-member-level' === $method ) {
				$result = $this->member_levels->create_member_level( $post_data );
			} elseif ( 'edit-member-level' === $method ) { // if it is edit, use the update method
				$id     = esc_attr( $post_data['id'] );
				$result = $this->member_levels->update_member_level( $post_data, $id );
			}
			if ( false === $result ) { // if the database didn't save, it's still an error
				$this->mp_mem_transients->set( $cachekey, $post_data );
				if ( '' !== $cachekey ) {
					$url = esc_url_raw( $post_data['redirect_url_error'] ) . '&transient=' . $cachekey;
				}
			} else {
				if ( isset( $post_data['transient'] ) ) { // there was previously an error saved. can delete it now.
					$this->mp_mem_transients->delete( esc_attr( $post_data['transient'] ) );
				}
				// then send the user to the list of fieldmaps
				$url = esc_url_raw( $post_data['redirect_url_success'] );
			}
		}
		wp_safe_redirect( $url );
		exit();
	}

	/**
	* Delete member level data and redirect after processing
	* This runs when the delete link is clicked, after the user confirms
	* It is public because it depends on an admin hook
	* It then calls the MinnPost_Membership_Member_Level class and the delete method
	*
	*/
	public function delete_member_level() {
		$post_data = filter_input_array( INPUT_POST, FILTER_SANITIZE_STRING );
		if ( $post_data['id'] ) {
			$result = $this->member_levels->delete_member_level( $post_data['id'] );
			if ( true === $result ) {
				$url = esc_url_raw( $post_data['redirect_url_success'] );
			} else {
				$url = esc_url_raw( $post_data['redirect_url_error'] . '&id=' . $post_data['id'] );
			}
			wp_safe_redirect( $url );
			exit();
		}
	}


	/**
	* Default display for <input> fields
	*
	* @param array $args
	*/
	public function display_input_field( $args ) {
		$type    = $args['type'];
		$id      = $args['label_for'];
		$name    = $args['name'];
		$desc    = $args['desc'];
		$checked = '';

		$class = 'regular-text';

		if ( 'checkbox' === $type ) {
			$class = 'checkbox';
		}

		if ( ! isset( $args['constant'] ) || ! defined( $args['constant'] ) ) {
			$value = esc_attr( get_option( $id, '' ) );
			if ( 'checkbox' === $type ) {
				if ( '1' === $value ) {
					$checked = 'checked ';
				}
				$value = 1;
			}
			if ( '' === $value && isset( $args['default'] ) && '' !== $args['default'] ) {
				$value = $args['default'];
			}

			echo sprintf( '<input type="%1$s" value="%2$s" name="%3$s" id="%4$s" class="%5$s"%6$s>',
				esc_attr( $type ),
				esc_attr( $value ),
				esc_attr( $name ),
				esc_attr( $id ),
				sanitize_html_class( $class . esc_html( ' code' ) ),
				esc_html( $checked )
			);
			if ( '' !== $desc ) {
				echo sprintf( '<p class="description">%1$s</p>',
					esc_html( $desc )
				);
			}
		} else {
			echo sprintf( '<p><code>%1$s</code></p>',
				esc_html__( 'Defined in wp-config.php', 'minnpost-membership' )
			);
		}
	}

	/**
	* Display for multiple checkboxes
	* Above method can handle a single checkbox as it is
	*
	* @param array $args
	*/
	public function display_checkboxes( $args ) {
		$type = 'checkbox';
		if ( 'radio' === $args['type'] ) {
			$type = 'radio';
		}

		$name       = $args['name'];
		$group_desc = $args['desc'];
		$options    = get_option( $name, array() );

		foreach ( $args['items'] as $key => $value ) {
			$text = $value['text'];
			$id   = $value['id'];
			$desc = $value['desc'];
			if ( isset( $value['value'] ) ) {
				$item_value = $value['value'];
			} else {
				$item_value = $key;
			}
			$checked = '';
			if ( is_array( $options ) && in_array( (string) $item_value, $options, true ) ) {
				$checked = 'checked';
			} elseif ( is_array( $options ) && empty( $options ) ) {
				if ( isset( $value['default'] ) && true === $value['default'] ) {
					$checked = 'checked';
				}
			}

			$input_name = $name;

			echo sprintf( '<div class="checkbox"><label><input type="%1$s" value="%2$s" name="%3$s[]" id="%4$s"%5$s>%6$s</label></div>',
				esc_attr( $type ),
				esc_attr( $item_value ),
				esc_attr( $input_name ),
				esc_attr( $id ),
				esc_html( $checked ),
				esc_html( $text )
			);
			if ( '' !== $desc ) {
				echo sprintf( '<p class="description">%1$s</p>',
					esc_html( $desc )
				);
			}
		}

		if ( '' !== $group_desc ) {
			echo sprintf( '<p class="description">%1$s</p>',
				esc_html( $group_desc )
			);
		}

	}

	/**
	* Display for a dropdown/select
	*
	* @param array $args
	*/
	public function display_select( $args ) {
		$type = $args['type'];
		$id   = $args['label_for'];
		$name = $args['name'];
		$desc = $args['desc'];
		if ( ! isset( $args['constant'] ) || ! defined( $args['constant'] ) ) {
			$current_value = get_option( $name );

			echo sprintf( '<div class="select"><select id="%1$s" name="%2$s"><option value="">- Select one -</option>',
				esc_attr( $id ),
				esc_attr( $name )
			);

			foreach ( $args['items'] as $key => $value ) {
				$text     = $value['text'];
				$value    = $value['value'];
				$selected = '';
				if ( $key === $current_value || $value === $current_value ) {
					$selected = ' selected';
				}

				echo sprintf( '<option value="%1$s"%2$s>%3$s</option>',
					esc_attr( $value ),
					esc_attr( $selected ),
					esc_html( $text )
				);

			}
			echo '</select>';
			if ( '' !== $desc ) {
				echo sprintf( '<p class="description">%1$s</p>',
					esc_html( $desc )
				);
			}
			echo '</div>';
		} else {
			echo sprintf( '<p><code>%1$s</code></p>',
				esc_html__( 'Defined in wp-config.php', 'minnpost-membership' )
			);
		}
	}

	/**
	* Display for a dropdown/select
	*
	* @param array $args
	*/
	public function display_textarea( $args ) {
		$id    = $args['label_for'];
		$name  = $args['name'];
		$desc  = $args['desc'];
		$rows  = $args['rows'];
		$cols  = $args['cols'];
		$class = 'regular-text';
		if ( ! isset( $args['constant'] ) || ! defined( $args['constant'] ) ) {
			$value = esc_attr( get_option( $id, '' ) );
			if ( '' === $value && isset( $args['default'] ) && '' !== $args['default'] ) {
				$value = $args['default'];
			}

			if ( '' !== $rows ) {
				$rows_attr = ' rows="' . esc_attr( $rows ) . '"';
			} else {
				$rows_attr = '';
			}

			if ( '' !== $cols ) {
				$cols_attr = ' cols="' . esc_attr( $cols ) . '"';
			} else {
				$cols_attr = '';
			}

			echo sprintf( '<textarea name="%1$s" id="%2$s" class="%3$s"%4$s%5$s>%6$s</textarea>',
				esc_attr( $name ),
				esc_attr( $id ),
				sanitize_html_class( $class . esc_html( ' code' ) ),
				$rows_attr,
				$cols_attr,
				esc_attr( $value )
			);
			if ( '' !== $desc ) {
				echo sprintf( '<p class="description">%1$s</p>',
					esc_html( $desc )
				);
			}
		} else {
			echo sprintf( '<p><code>%1$s</code></p>',
				esc_html__( 'Defined in wp-config.php', 'minnpost-membership' )
			);
		}
	}

	/**
	* Display for a wysiwyg editir
	*
	* @param array $args
	*/
	public function display_editor( $args ) {
		$id      = $args['label_for'];
		$name    = $args['name'];
		$desc    = $args['desc'];
		$checked = '';

		$class = 'regular-text';

		if ( ! isset( $args['constant'] ) || ! defined( $args['constant'] ) ) {
			$value = esc_attr( get_option( $id, '' ) );
			if ( '' === $value && isset( $args['default'] ) && '' !== $args['default'] ) {
				$value = $args['default'];
			}

			wp_editor( $value, $id );
			if ( '' !== $desc ) {
				echo sprintf( '<p class="description">%1$s</p>',
					esc_html( $desc )
				);
			}
		} else {
			echo sprintf( '<p><code>%1$s</code></p>',
				esc_html__( 'Defined in wp-config.php', 'minnpost-membership' )
			);
		}
	}

	/**
	* Default display for <a href> links
	*
	* @param array $args
	*/
	public function display_link( $args ) {
		$label = $args['label'];
		$desc  = $args['desc'];
		$url   = $args['url'];
		if ( isset( $args['link_class'] ) ) {
			echo sprintf( '<p><a class="%1$s" href="%2$s">%3$s</a></p>',
				esc_attr( $args['link_class'] ),
				esc_url( $url ),
				esc_html( $label )
			);
		} else {
			echo sprintf( '<p><a href="%1$s">%2$s</a></p>',
				esc_url( $url ),
				esc_html( $label )
			);
		}

		if ( '' !== $desc ) {
			echo sprintf( '<p class="description">%1$s</p>',
				esc_html( $desc )
			);
		}

	}

}
