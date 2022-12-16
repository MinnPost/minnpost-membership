;(function($) {
"use strict";

(function (window) {
  function MinnPostMembership(data, settings) {
    this.data = {};
    if (typeof data !== 'undefined') {
      this.data = data;
    }
    this.settings = {};
    if (typeof settings !== 'undefined') {
      this.settings = settings;
    }
    this.previousAmount = '';
    if (typeof this.data.current_user !== 'undefined' && typeof this.data.current_user.previous_amount !== 'undefined') {
      this.previousAmount = this.data.current_user.previous_amount;
    }
  }
  MinnPostMembership.prototype = {
    checkLevel(amount, frequency, type) {
      let thisyear = parseInt(amount) * parseInt(frequency);
      if (typeof this.previousAmount !== 'undefined' && this.previousAmount !== '') {
        let prior_year_amount = parseInt(this.previousAmount.prior_year_contributions, 10);
        const coming_year_amount = parseInt(this.previousAmount.coming_year_contributions, 10);
        let annual_recurring_amount = parseInt(this.previousAmount.annual_recurring_amount, 10);
        // calculate member level formula
        if (type === 'one-time') {
          prior_year_amount += thisyear;
        } else {
          annual_recurring_amount += thisyear;
        }
        thisyear = Math.max(prior_year_amount, coming_year_amount, annual_recurring_amount);
      }
      return this.getLevel(thisyear);
    },
    // end checkLevel

    getLevel(thisyear) {
      const level = {
        yearlyAmount: thisyear
      };
      if (thisyear > 0 && thisyear < 60) {
        level.name = 'Bronze';
        level.number = 1;
      } else if (thisyear > 59 && thisyear < 120) {
        level.name = 'Silver';
        level.number = 2;
      } else if (thisyear > 119 && thisyear < 240) {
        level.name = 'Gold';
        level.number = 3;
      } else if (thisyear > 239) {
        level.name = 'Platinum';
        level.number = 4;
      }
      return level;
    } // end getLevel
  };

  window.MinnPostMembership = new MinnPostMembership(window.minnpost_membership_data, window.minnpost_membership_settings);
})(window);
"use strict";

// plugin
(function ($, window, document, MinnPostMembership) {
  // Create the defaults once
  const pluginName = 'minnpostAmountSelect',
    defaults = {
      frequencySelector: '.m-frequency-select input[type="radio"]',
      amountGroup: '.m-frequency-group',
      amountSelector: '.m-amount-select input[type="radio"]',
      amountLabels: '.m-amount-select label',
      amountValue: 'strong',
      amountDescription: '.a-amount-description',
      amountField: '.a-amount-field #amount',
      customAmountFrequency: '#amount-item .a-frequency-text-label',
      levelViewer: '.a-show-level',
      levelName: '.a-level',
      userCurrentLevel: '.a-current-level',
      declineBenefits: '.m-decline-benefits-select input[type="radio"]',
      giftSelectionGroup: '.m-membership-gift-selector',
      giftLevel: '.m-gift-level',
      giftSelector: '.m-gift-level .m-form-item input[type="radio"]',
      giftOptionSelector: '.a-gift-option-select',
      giftLabel: '.m-gift-level .m-form-item input[type="radio"] + label',
      swagEligibilityText: '.m-membership-gift-selector .swag-eligibility',
      swagSelector: '.m-select-swag input[type="radio"]',
      swagLabels: '.m-select-swag input[type="radio"] + label',
      minAmounts: '.m-membership-gift-selector .min-amount',
      declineGiftLevel: '.m-decline-level'
    };

  // The actual plugin constructor
  function Plugin(element, options) {
    this.element = element;

    // jQuery has an extend method which merges the contents of two or
    // more objects, storing the result in the first object. The first object
    // is generally empty as we don't want to alter the default options for
    // future instances of the plugin
    this.options = $.extend({}, defaults, options);
    this._defaults = defaults;
    this._name = pluginName;
    this.init();
  } // end constructor

  Plugin.prototype = {
    init() {
      const $frequency = $(this.element).find(this.options.frequencySelector);
      const $form = $(this.element);
      const $suggestedAmount = $(this.options.amountSelector);
      const $amount = $(this.element).find(this.options.amountField);
      const $declineBenefits = $(this.element).find(this.options.declineBenefits);
      const $gifts = $(this.element).find(this.options.giftSelector);
      if (!($amount.length > 0 && $frequency.length > 0 && $suggestedAmount.length > 0)) {
        return;
      }

      // Set up the UI for the current field state on (re-)load
      this.setAmountLabels($frequency.filter(':checked').val());
      this.setMinAmounts($frequency.filter(':checked').val());
      this.checkAndSetLevel(false);
      $frequency.on('change', this.onFrequencyChange.bind(this));
      $suggestedAmount.on('change', this.onSuggestedAmountChange.bind(this));
      $amount.on('keyup mouseup', this.onAmountChange.bind(this));
      if (!($declineBenefits.length > 0 && $gifts.length > 0)) {
        return;
      }

      // Set up the UI for the current field state on (re-)load
      if ($gifts.not(this.options.declineGiftLevel).is(':checked')) {
        $(this.element).find(this.options.declineGiftLevel).prop('checked', false);
      }
      this.onDeclineBenefitsChange();
      this.giftOptionSelect();
      this.setRequiredFields($gifts);
      $declineBenefits.on('change', this.onDeclineBenefitsChange.bind(this));
      $gifts.on('click', this.onGiftsClick.bind(this));

      // because the next url is generated by WordPress based on what the JavaScript does,
      // we should also use the JavaScript to run a form submit when that link is clicked.
      const form = document.querySelector('.m-form-membership');
      const navForSubmit = document.querySelector('.a-pay-url');
      navForSubmit.addEventListener('click', function (event) {
        form.submit();
        event.preventDefault();
      });

      // when the form is submitted
      document.querySelectorAll('.m-form-membership').forEach(membershipForm => membershipForm.addEventListener('submit', event => {
        this.onFormSubmit(event);
      }));
    },
    // end init

    /*
     * run an analytics product action
     */
    analyticsProductAction(level, amount, frequency_label, action, step) {
      const product = this.analyticsProduct(level, amount, frequency_label);
      wp.hooks.doAction('minnpostMembershipAnalyticsEcommerceAction', 'event', action, product, step);
    },
    // end analyticsProductAction

    /**
     * Run a dataLayer product action
     *
     * @param  level
     * @param  amount
     * @param  frequency_label
     * @param  action
     */
    dataLayerProductAction(level, amount, frequency_label, action) {
      if (typeof wp !== 'undefined') {
        const product = this.analyticsProduct(level, amount, frequency_label);
        const dataLayerContent = {
          action,
          product
        };
        wp.hooks.doAction('minnpostMembershipDataLayerEcommerceAction', dataLayerContent);
      }
    },
    // end dataLayerProductAction

    /*
     * run an analytics cart action
     */
    analyticsCartAction(level, amount, frequency_label) {
      const product = this.analyticsProduct(level.name, amount, frequency_label);
      wp.hooks.doAction('minnpostMembershipAnalyticsEcommerceAction', 'event', 'add_to_cart', product);
      wp.hooks.doAction('minnpostMembershipAnalyticsEcommerceAction', 'event', 'begin_checkout', product);
    },
    // end analyticsCartAction

    /*
     * run an dataLayer cart action
     */
    dataLayerCartAction(level, amount, frequency_label) {
      const product = this.analyticsProduct(level.name, amount, frequency_label);
      const dataLayerAddToCart = {
        action: 'add_to_cart',
        product
      };
      wp.hooks.doAction('minnpostMembershipDataLayerEcommerceAction', dataLayerAddToCart);
      const dataLayerBeginCheckout = {
        action: 'begin_checkout',
        product
      };
      wp.hooks.doAction('minnpostMembershipDataLayerEcommerceAction', dataLayerBeginCheckout);
    },
    // end dataLayerCartAction

    /*
     * create an analytics product variable
     */
    analyticsProduct(level, amount, frequency_label) {
      const product = {
        item_id: 'minnpost_' + level.toLowerCase() + '_membership',
        item_name: 'MinnPost ' + level.charAt(0).toUpperCase() + level.slice(1) + ' Membership',
        item_category: 'Donation',
        item_brand: 'MinnPost',
        item_variant: frequency_label,
        price: amount,
        quantity: 1
      };
      return product;
    },
    // end analyticsProduct

    onFrequencyChange(event) {
      this.setAmountLabels($(event.target).val());
      this.setMinAmounts($(event.target).val());
      this.checkAndSetLevel(true);
    },
    // end onFrequencyChange

    onSuggestedAmountChange(event) {
      $(this.element).find(this.options.amountField).val(null);
      this.checkAndSetLevel(true);
    },
    // end onSuggestedAmountChange

    onAmountChange(event) {
      this.clearAmountSelector(event);
      const $target = $(event.target);
      if ($target.data('last-value') != $target.val()) {
        $target.data('last-value', $target.val());
        this.checkAndSetLevel(true);
      }
    },
    // end onAmountChange

    onDeclineBenefitsChange(event) {
      const $giftSelectionGroup = $(this.element).find(this.options.giftSelectionGroup);
      const decline = $(this.element).find(this.options.declineBenefits).filter(':checked').val();
      if (decline === 'true') {
        $giftSelectionGroup.hide();
        return;
      }
      $giftSelectionGroup.show();
    },
    // end onDeclineBenefitsChange

    giftOptionSelect() {
      const parent = $(this.options.giftOptionSelector).parent().parent().find('input[type="radio"]');
      $(this.options.giftOptionSelector).change(function () {
        const selectedOption = $(this).children('option:selected').val();
        if ('' !== selectedOption) {
          parent.prop('checked', true);
        }
      });
    },
    // end giftOptionSelect

    onGiftsClick(event) {
      const $gifts = $(this.element).find(this.options.giftSelector).not(this.options.declineGiftLevel);
      const $decline = $(this.element).find(this.options.declineGiftLevel);
      if ($(event.target).is(this.options.declineGiftLevel)) {
        $gifts.prop('checked', false);
        return;
      }
      this.setRequiredFields($gifts);
      $decline.prop('checked', false);
    },
    // end onGiftsClick

    setRequiredFields($gifts) {
      const $checkedGifts = $gifts.filter(':checked');
      if ($checkedGifts) {
        $("[data-required='true']").prop('required', false);
        $checkedGifts.each(function () {
          const setRequired = function () {
            $(this).prop('required', true);
          };
          $("[data-required='true']", $(this).parent()).each(setRequired);
        });
      }
    },
    // end setRequiredFields

    onFormSubmit(event) {
      let amount = $(this.options.amountSelector).filter(':checked').val();
      if (typeof amount === 'undefined') {
        amount = $(this.options.amountField).val();
      }
      const frequency_string = $(this.options.frequencySelector + ':checked').val();
      const frequency = frequency_string.split(' - ')[1];
      const frequency_name = frequency_string.split(' - ')[0];
      const frequency_id = $(this.options.frequencySelector + ':checked').prop('id');
      const frequency_label = $('label[for="' + frequency_id + '"]').text();
      const level = MinnPostMembership.checkLevel(amount, frequency, frequency_name);
      const options = {
        type: 'event',
        category: 'Support Us',
        action: 'Become A Member',
        label: location.pathname
      };
      // this tracks an event submission based on the plugin options
      // it also bubbles the event up to submit the form
      // gtm can detect the form submission itself.
      wp.hooks.doAction('minnpostMembershipAnalyticsEvent', options.type, options.category, options.action, options.label);
      const hasClass = event.target.classList.contains('m-form-membership-support');
      // if this is the main checkout form, send it to the ec plugin or gtm as a checkout
      if (hasClass) {
        this.analyticsCartAction(level, amount, frequency_label);
        this.dataLayerCartAction(level, amount, frequency_label);
      }
    },
    // end onFormSubmit

    clearAmountSelector(event) {
      const $suggestedAmount = $(this.options.amountSelector);
      if ($(event.target).val() === '') {
        return;
      }
      $suggestedAmount.prop('checked', false);
    },
    // end clearAmountSelector

    setAmountLabels(frequencyString) {
      const $groups = $(this.options.amountGroup);
      const $selected = $(this.options.amountSelector).filter(':checked');
      const index = $selected.data('index');
      const $customAmountFrequency = $(this.options.customAmountFrequency);
      $groups.removeClass('active');
      $groups.filter('[data-frequency="' + frequencyString + '"]').addClass('active');
      $selected.prop('checked', false);
      $groups.filter('.active').find('input[type="radio"][data-index="' + index + '"]').prop('checked', true);
      const currentFrequencyLabel = $groups.filter('.active').find('.a-frequency-text-label').first().text();
      $customAmountFrequency.text(currentFrequencyLabel);
    },
    // end setAmountLabels

    setMinAmounts(frequencyString) {
      const $elements = $(this.options.minAmounts);
      $elements.removeClass('active');
      $elements.filter('[data-frequency="' + frequencyString + '"]').addClass('active');
    },
    // end setMinAmounts

    checkAndSetLevel(updated) {
      let amount = $(this.options.amountSelector).filter(':checked').val();
      if (typeof amount === 'undefined') {
        amount = $(this.options.amountField).val();
      }
      const frequency_string = $(this.options.frequencySelector + ':checked').val();
      const frequency = frequency_string.split(' - ')[1];
      const frequency_name = frequency_string.split(' - ')[0];
      const frequency_id = $(this.options.frequencySelector + ':checked').prop('id');
      const frequency_label = $('label[for="' + frequency_id + '"]').text();
      const level = MinnPostMembership.checkLevel(amount, frequency, frequency_name);
      this.showNewLevel(this.element, this.options, level);
      this.setEnabledGifts(level);
      this.analyticsProductAction(level.name, amount, frequency_label, 'select_content', 1);
      this.dataLayerProductAction(level.name, amount, frequency_label, 'select_item');
    },
    // end checkAndSetLevel

    showNewLevel(element, options, level) {
      let member_level_prefix = '';
      let old_level = '';
      let levelViewerContainer = options.levelViewer; // this should change when we replace the text, if there is a link inside it
      const decodeHtmlEntity = function (str) {
        return str.replace(/&#(\d+);/g, function (match, dec) {
          return String.fromCharCode(dec);
        });
      };
      if (typeof minnpost_membership_data !== 'undefined') {
        member_level_prefix = minnpost_membership_data.member_level_prefix;
      }
      if ($(options.levelViewer).length > 0) {
        $(options.levelViewer).prop('class', 'a-show-level a-show-level-' + level.name.toLowerCase());
        if ($(options.userCurrentLevel).length > 0 && minnpost_membership_data.current_user.member_level.length > 0) {
          if ('a', $(options.levelViewer).length > 0) {
            levelViewerContainer = options.levelViewer + ' a';
          }
          old_level = minnpost_membership_data.current_user.member_level.replace(member_level_prefix, '');
          if (old_level !== level.name.toLowerCase()) {
            $(levelViewerContainer).html(decodeHtmlEntity($(options.levelViewer).data('changed')));
          } else {
            $(levelViewerContainer).html(decodeHtmlEntity($(options.levelViewer).data('not-changed')));
          }
        }
        $(options.levelName, options.levelViewer).text(level.name);
      }
    },
    // end showNewLevel

    setEnabledGifts(level) {
      const setEnabled = function () {
        $(this).prop('disabled', level.yearlyAmount < $(this).data('minYearlyAmount'));
      };
      $(this.options.giftSelector).each(setEnabled);
      if ($(this.options.swagSelector).not('#swag-decline').is(':enabled')) {
        $('.swag-disabled').removeClass('active');
        $('.swag-enabled').addClass('active');
      } else {
        $('.swag-disabled').addClass('active');
        $('.swag-enabled').removeClass('active');
      }
    } // end setEnabledGifts
  }; // end Plugin.prototype

  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations
  $.fn[pluginName] = function (options) {
    return this.each(function () {
      if (!$.data(this, 'plugin_' + pluginName)) {
        $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
      }
    });
  };
})(jQuery, window, document, MinnPostMembership);
"use strict";

(function ($) {
  function benefitForm() {
    if ('back_forward' === performance.getEntriesByType('navigation')[0].type) {
      location.reload(true);
    }
    $('.a-benefit-button.a-button-disabled').removeAttr('disabled');
    $('.a-benefit-button').click(function (event) {
      event.preventDefault();
      const $button = $(this);
      const $status = $('.m-benefit-message', $(this).parent());
      const $select = $('select', $(this).parent());
      const settings = minnpost_membership_settings;
      // reset the message for current status
      if (!'.m-benefit-message-success') {
        $('.m-benefit-message').removeClass('m-benefit-message-visible m-benefit-message-error m-benefit-message-info');
      }
      // set button to processing
      $button.text('Processing').addClass('a-button-disabled');

      // disable all the other buttons
      $('.a-benefit-button').addClass('a-button-disabled');

      // set ajax data
      let data = {};
      const benefitType = $('input[name="benefit-name"]').val();
      if ('partner-offers' === benefitType) {
        data = {
          action: 'benefit_form_submit',
          minnpost_membership_benefit_form_nonce: $button.data('benefit-nonce'),
          current_url: $('input[name="current_url"]').val(),
          'benefit-name': $('input[name="benefit-name"]').val(),
          instance_id: $('[name="instance-id-' + $button.val() + '"]').val(),
          post_id: $button.val(),
          is_ajax: '1'
        };
        $.post(settings.ajaxurl, data, function (response) {
          // success
          if (true === response.success) {
            //console.dir(response);
            $button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
            $status.html(response.data.message).addClass('m-benefit-message-visible ' + response.data.message_class);
            if (0 < $select.length) {
              $select.prop('disabled', true);
            }
            $('.a-benefit-button').not($button).val(response.data.button_value).attr('disabled', true);
          } else {
            // error
            //console.dir(response);
            if ('undefined' === typeof response.data.remove_instance_value) {
              if ('' !== response.data.button_label) {
                $button.show();
                $button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
              } else {
                $button.hide();
              }
            } else {
              $('option', $select).each(function (i) {
                if ($(this).val() === response.data.remove_instance_value) {
                  $(this).remove();
                }
              });
              if ('' !== response.data.button_label) {
                $button.show();
                $button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
              } else {
                $button.hide();
              }
            }
            // re-enable all the other buttons
            $('.a-benefit-button').not($button).removeClass('a-button-disabled');
            $status.html(response.data.message).addClass('m-benefit-message-visible ' + response.data.message_class);
          }
        });
      }
    });
  }
  $(document).ready(function () {
    if (0 < $('.m-form-membership-benefit').length) {
      benefitForm();
    }
    $('.a-refresh-page').on('click', function (event) {
      event.preventDefault();
      location.reload();
    });
  });
})(jQuery);
"use strict";

const button = document.querySelector('.m-support-cta-top .a-support-button');
if (button) {
  button.addEventListener('click', function (event) {
    let value = '';
    const svg = button.querySelector('svg');
    if (null !== svg) {
      const attribute = svg.getAttribute('title');
      if (null !== attribute) {
        value = attribute + ' ';
      }
    }
    value = value + button.textContent;
    wp.hooks.doAction('minnpostMembershipAnalyticsEvent', 'event', 'Support CTA - Header', 'Click: ' + value, location.pathname);
  });
}
"use strict";

// plugin
(function ($, window, document, MinnPostMembership, undefined) {
  // Create the defaults once
  const pluginName = 'minnpostMembership',
    defaults = {
      debug: false,
      // this can be set to true on page level options
      amount_viewer: '.amount h3',
      frequency_selector_in_levels: '.a-form-item-membership-frequency',
      frequency_selector_in_levels_type: 'select',
      levels_container: '.o-membership-member-levels',
      single_level_container: '.m-membership-member-level',
      single_level_summary_selector: '.m-member-level-brief',
      flipped_items: 'div.amount, div.enter',
      level_frequency_text_selector: '.show-frequency',
      choose_amount_selector_in_levels: '.amount .a-button-flip',
      amount_selector_in_levels: '.enter input.amount-entry'
    }; // end defaults

  // The actual plugin constructor
  function Plugin(element, options) {
    this.element = element;

    // jQuery has an extend method which merges the contents of two or
    // more objects, storing the result in the first object. The first object
    // is generally empty as we don't want to alter the default options for
    // future instances of the plugin
    this.options = $.extend({}, defaults, options);
    this._defaults = defaults;
    this._name = pluginName;
    this.init();
  } // end constructor

  Plugin.prototype = {
    init(reset, amount) {
      // Place initialization logic here
      // You already have access to the DOM element and
      // the options via the instance, e.g. this.element
      // and this.options
      // you can add more functions like the one below and
      // call them like so: this.yourOtherFunction(this.element, this.options).
      this.catchHashLinks(this.element, this.options);
      this.levelFlipper(this.element, this.options);
      this.startLevelClick(this.element, this.options);
    },
    catchHashLinks(element, options) {
      $('a[href*="#"]:not([href="#"])', element).click(function (e) {
        var target = $(e.target);
        if (target.parent('.comment-title').length == 0 && location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
          var target = $(this.hash);
          target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
          if (target.length) {
            $('html,body').animate({
              scrollTop: target.offset().top
            }, 1000);
            return false;
          }
        }
      });
    },
    // end catchLinks

    levelFlipper(element, options) {
      const that = this;
      let amount = 0;
      let level = '';
      let level_number = 0;
      let frequency_string = '';
      let frequency = '';
      let frequency_name = '';
      if ($(options.levels_container).length > 0) {
        $(options.single_level_summary_selector, element).each(function () {
          $(options.flipped_items, $(this)).wrapAll('<div class="flipper"/>');
        });
        $(options.frequency_selector_in_levels, element).on('change', function (event) {
          level_number = $(this).data('member-level-number');
          frequency_string = $(this).val();
          frequency = frequency_string.split(' - ')[1];
          frequency_name = frequency_string.split(' - ')[0];
          if (typeof level_number !== 'undefined') {
            $(options.single_level_summary_selector, element).removeClass('flipped');
            $(options.single_level_container, element).removeClass('active');
            $(event.target).closest(options.single_level_summary_selector).addClass('flipped');
            if (frequency == 1) {
              $(options.amount_selector_in_levels, $(options.single_level_container + '-' + level_number)).val($(options.amount_viewer, $(options.single_level_container + '-' + level_number)).data('default-yearly'));
            } else if (frequency == 12) {
              $(options.amount_selector_in_levels, $(options.single_level_container + '-' + level_number)).val($(options.amount_viewer, $(options.single_level_container + '-' + level_number)).data('default-monthly'));
            }
            amount = $(options.amount_selector_in_levels + '[data-member-level-number="' + level_number + '"]').val();
            level = that.checkLevel(amount, frequency, frequency_name, element, options);
            that.changeFrequency(frequency_string, level.name, element, options);
          } else if ($(options.level_frequency_text_selector).length > 0) {
            $(options.level_frequency_text_selector, element).text(frequency_name);
            $(options.single_level_container).each(function () {
              level_number = $(options.amount_selector_in_levels, $(this)).data('member-level-number');
              if (typeof level_number !== 'undefined') {
                amount = $(options.amount_selector_in_levels, $(this)).val();
                level = that.checkLevel(amount, frequency, frequency_name, element, options);
              }
            });
          }
          that.changeAmountPreview(frequency_string, level.name, element, options);
        });
      }
      if ($(options.choose_amount_selector_in_levels).length > 0) {
        $(options.choose_amount_selector_in_levels, element).click(function (event) {
          level_number = $(options.frequency_selector_in_levels, element).data('member-level-number');
          $(options.single_level_summary_selector, element).removeClass('flipped');
          $(options.single_level_container, element).removeClass('active');
          $(event.target).closest(options.single_level_summary_selector).addClass('flipped');
          frequency_string = $(options.frequency_selector_in_levels, $(this).parent()).val();
          frequency = frequency_string.split(' - ')[1];
          amount = $(options.amount_selector_in_levels + '[data-member-level-number="' + level_number + '"]').val();
          level = that.checkLevel(amount, frequency, frequency_name, element, options);
          event.preventDefault();
        });
      }
    },
    // end levelFlipper

    checkLevel(amount, frequency, type, element, options) {
      const level = MinnPostMembership.checkLevel(amount, frequency, type);
      $('h2', options.single_level_summary_selector).each(function () {
        if ($(this).text() == level.name) {
          $(options.single_level_container, element).removeClass('active');
          $(this).parent().parent().addClass('active');
        }
      });
      return level;
    },
    // end checkLevel

    changeFrequency(selected, level, element, options) {
      $(options.single_level_summary_selector).each(function () {
        let range = $(options.amount_viewer, $(this)).text();
        const month_value = $(options.amount_viewer, $(this)).data('month');
        const year_value = $(options.amount_viewer, $(this)).data('year');
        const once_value = $(options.amount_viewer, $(this)).data('one-time');
        const frequency_name = selected.split(' - ')[0];
        const frequency = parseInt(selected.split(' - ')[1]);
        $(options.frequency_selector_in_levels).val(selected);
        $(options.frequency_selector_in_levels).prop('selected', selected);
        if (frequency_name == 'per month') {
          range = month_value;
          $(options.amount_viewer, $(this)).removeClass('smaller');
        } else if (frequency_name == 'per year') {
          range = year_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        } else if (frequency_name == 'one-time') {
          range = once_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        }
        $(options.amount_viewer, $(this)).text(range);
        $(options.frequency_selector_in_levels, $(this)).data('frequency', frequency);
      });
    },
    // end changeFrequency

    changeAmountPreview(selected, level, element, options) {
      $(options.single_level_summary_selector).each(function () {
        let range = $(options.amount_viewer, $(this)).text();
        const month_value = $(options.amount_viewer, $(this)).data('month');
        const year_value = $(options.amount_viewer, $(this)).data('year');
        const once_value = $(options.amount_viewer, $(this)).data('one-time');
        const frequency_name = selected.split(' - ')[0];
        if (frequency_name == 'per month') {
          range = month_value;
          $(options.amount_viewer, $(this)).removeClass('smaller');
        } else if (frequency_name == 'per year') {
          range = year_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        } else if (frequency_name == 'one-time') {
          range = once_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        }
        $(options.amount_viewer, $(this)).text(range);
      });
    },
    // end changeAmountPreview

    startLevelClick(element, options) {
      $('.start-level').click(function () {
        const level_class = $(this).prop('class');
        const level_number = level_class[level_class.length - 1];
        $(options.single_level_summary_selector, element).removeClass('flipped');
        $(options.single_level_container, element).removeClass('active');
        $(options.single_level_container + '-' + level_number, element).addClass('active');
        $(options.single_level_container + '-' + level_number + ' ' + options.single_level_summary_selector).addClass('flipped');
      });
    } // end startLevelClick
  }; // end Plugin.prototype

  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations
  $.fn[pluginName] = function (options) {
    return this.each(function () {
      if (!$.data(this, 'plugin_' + pluginName)) {
        $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
      }
    });
  };
})(jQuery, window, document, MinnPostMembership);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1pbm5wb3N0LW1lbWJlcnNoaXAuanMiLCJhbW91bnQtc2VsZWN0LmpzIiwiYmVuZWZpdHMuanMiLCJjdGEuanMiLCJtZW1iZXItbGV2ZWxzLmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsIk1pbm5Qb3N0TWVtYmVyc2hpcCIsImRhdGEiLCJzZXR0aW5ncyIsInByZXZpb3VzQW1vdW50IiwiY3VycmVudF91c2VyIiwicHJldmlvdXNfYW1vdW50IiwicHJvdG90eXBlIiwiY2hlY2tMZXZlbCIsImFtb3VudCIsImZyZXF1ZW5jeSIsInR5cGUiLCJ0aGlzeWVhciIsInBhcnNlSW50IiwicHJpb3JfeWVhcl9hbW91bnQiLCJwcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMiLCJjb21pbmdfeWVhcl9hbW91bnQiLCJjb21pbmdfeWVhcl9jb250cmlidXRpb25zIiwiYW5udWFsX3JlY3VycmluZ19hbW91bnQiLCJNYXRoIiwibWF4IiwiZ2V0TGV2ZWwiLCJsZXZlbCIsInllYXJseUFtb3VudCIsIm5hbWUiLCJudW1iZXIiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX3NldHRpbmdzIiwiJCIsImRvY3VtZW50IiwicGx1Z2luTmFtZSIsImRlZmF1bHRzIiwiZnJlcXVlbmN5U2VsZWN0b3IiLCJhbW91bnRHcm91cCIsImFtb3VudFNlbGVjdG9yIiwiYW1vdW50TGFiZWxzIiwiYW1vdW50VmFsdWUiLCJhbW91bnREZXNjcmlwdGlvbiIsImFtb3VudEZpZWxkIiwiY3VzdG9tQW1vdW50RnJlcXVlbmN5IiwibGV2ZWxWaWV3ZXIiLCJsZXZlbE5hbWUiLCJ1c2VyQ3VycmVudExldmVsIiwiZGVjbGluZUJlbmVmaXRzIiwiZ2lmdFNlbGVjdGlvbkdyb3VwIiwiZ2lmdExldmVsIiwiZ2lmdFNlbGVjdG9yIiwiZ2lmdE9wdGlvblNlbGVjdG9yIiwiZ2lmdExhYmVsIiwic3dhZ0VsaWdpYmlsaXR5VGV4dCIsInN3YWdTZWxlY3RvciIsInN3YWdMYWJlbHMiLCJtaW5BbW91bnRzIiwiZGVjbGluZUdpZnRMZXZlbCIsIlBsdWdpbiIsImVsZW1lbnQiLCJvcHRpb25zIiwiZXh0ZW5kIiwiX2RlZmF1bHRzIiwiX25hbWUiLCJpbml0IiwiJGZyZXF1ZW5jeSIsImZpbmQiLCIkZm9ybSIsIiRzdWdnZXN0ZWRBbW91bnQiLCIkYW1vdW50IiwiJGRlY2xpbmVCZW5lZml0cyIsIiRnaWZ0cyIsImxlbmd0aCIsInNldEFtb3VudExhYmVscyIsImZpbHRlciIsInZhbCIsInNldE1pbkFtb3VudHMiLCJjaGVja0FuZFNldExldmVsIiwib24iLCJvbkZyZXF1ZW5jeUNoYW5nZSIsImJpbmQiLCJvblN1Z2dlc3RlZEFtb3VudENoYW5nZSIsIm9uQW1vdW50Q2hhbmdlIiwibm90IiwiaXMiLCJwcm9wIiwib25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UiLCJnaWZ0T3B0aW9uU2VsZWN0Iiwic2V0UmVxdWlyZWRGaWVsZHMiLCJvbkdpZnRzQ2xpY2siLCJmb3JtIiwicXVlcnlTZWxlY3RvciIsIm5hdkZvclN1Ym1pdCIsImFkZEV2ZW50TGlzdGVuZXIiLCJldmVudCIsInN1Ym1pdCIsInByZXZlbnREZWZhdWx0IiwicXVlcnlTZWxlY3RvckFsbCIsImZvckVhY2giLCJtZW1iZXJzaGlwRm9ybSIsIm9uRm9ybVN1Ym1pdCIsImFuYWx5dGljc1Byb2R1Y3RBY3Rpb24iLCJmcmVxdWVuY3lfbGFiZWwiLCJhY3Rpb24iLCJzdGVwIiwicHJvZHVjdCIsImFuYWx5dGljc1Byb2R1Y3QiLCJ3cCIsImhvb2tzIiwiZG9BY3Rpb24iLCJkYXRhTGF5ZXJQcm9kdWN0QWN0aW9uIiwiZGF0YUxheWVyQ29udGVudCIsImFuYWx5dGljc0NhcnRBY3Rpb24iLCJkYXRhTGF5ZXJDYXJ0QWN0aW9uIiwiZGF0YUxheWVyQWRkVG9DYXJ0IiwiZGF0YUxheWVyQmVnaW5DaGVja291dCIsIml0ZW1faWQiLCJ0b0xvd2VyQ2FzZSIsIml0ZW1fbmFtZSIsImNoYXJBdCIsInRvVXBwZXJDYXNlIiwic2xpY2UiLCJpdGVtX2NhdGVnb3J5IiwiaXRlbV9icmFuZCIsIml0ZW1fdmFyaWFudCIsInByaWNlIiwicXVhbnRpdHkiLCJ0YXJnZXQiLCJjbGVhckFtb3VudFNlbGVjdG9yIiwiJHRhcmdldCIsIiRnaWZ0U2VsZWN0aW9uR3JvdXAiLCJkZWNsaW5lIiwiaGlkZSIsInNob3ciLCJwYXJlbnQiLCJjaGFuZ2UiLCJzZWxlY3RlZE9wdGlvbiIsImNoaWxkcmVuIiwiJGRlY2xpbmUiLCIkY2hlY2tlZEdpZnRzIiwiZWFjaCIsInNldFJlcXVpcmVkIiwiZnJlcXVlbmN5X3N0cmluZyIsInNwbGl0IiwiZnJlcXVlbmN5X25hbWUiLCJmcmVxdWVuY3lfaWQiLCJ0ZXh0IiwiY2F0ZWdvcnkiLCJsYWJlbCIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJoYXNDbGFzcyIsImNsYXNzTGlzdCIsImNvbnRhaW5zIiwiZnJlcXVlbmN5U3RyaW5nIiwiJGdyb3VwcyIsIiRzZWxlY3RlZCIsImluZGV4IiwiJGN1c3RvbUFtb3VudEZyZXF1ZW5jeSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJjdXJyZW50RnJlcXVlbmN5TGFiZWwiLCJmaXJzdCIsIiRlbGVtZW50cyIsInVwZGF0ZWQiLCJzaG93TmV3TGV2ZWwiLCJzZXRFbmFibGVkR2lmdHMiLCJtZW1iZXJfbGV2ZWxfcHJlZml4Iiwib2xkX2xldmVsIiwibGV2ZWxWaWV3ZXJDb250YWluZXIiLCJkZWNvZGVIdG1sRW50aXR5Iiwic3RyIiwicmVwbGFjZSIsIm1hdGNoIiwiZGVjIiwiU3RyaW5nIiwiZnJvbUNoYXJDb2RlIiwibWVtYmVyX2xldmVsIiwiaHRtbCIsInNldEVuYWJsZWQiLCJmbiIsImpRdWVyeSIsImJlbmVmaXRGb3JtIiwicGVyZm9ybWFuY2UiLCJnZXRFbnRyaWVzQnlUeXBlIiwicmVsb2FkIiwicmVtb3ZlQXR0ciIsImNsaWNrIiwiJGJ1dHRvbiIsIiRzdGF0dXMiLCIkc2VsZWN0IiwiYmVuZWZpdFR5cGUiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX2JlbmVmaXRfZm9ybV9ub25jZSIsImN1cnJlbnRfdXJsIiwiaW5zdGFuY2VfaWQiLCJwb3N0X2lkIiwiaXNfYWpheCIsInBvc3QiLCJhamF4dXJsIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwiYnV0dG9uX3ZhbHVlIiwiYnV0dG9uX2xhYmVsIiwiYnV0dG9uX2NsYXNzIiwiYnV0dG9uX2F0dHIiLCJtZXNzYWdlIiwibWVzc2FnZV9jbGFzcyIsImF0dHIiLCJyZW1vdmVfaW5zdGFuY2VfdmFsdWUiLCJpIiwicmVtb3ZlIiwicmVhZHkiLCJidXR0b24iLCJ2YWx1ZSIsInN2ZyIsImF0dHJpYnV0ZSIsImdldEF0dHJpYnV0ZSIsInRleHRDb250ZW50IiwidW5kZWZpbmVkIiwiZGVidWciLCJhbW91bnRfdmlld2VyIiwiZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyIsImZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHNfdHlwZSIsImxldmVsc19jb250YWluZXIiLCJzaW5nbGVfbGV2ZWxfY29udGFpbmVyIiwic2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IiLCJmbGlwcGVkX2l0ZW1zIiwibGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IiLCJjaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyIsImFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJyZXNldCIsImNhdGNoSGFzaExpbmtzIiwibGV2ZWxGbGlwcGVyIiwic3RhcnRMZXZlbENsaWNrIiwiZSIsImhvc3RuYW1lIiwiaGFzaCIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiLCJ0aGF0IiwibGV2ZWxfbnVtYmVyIiwid3JhcEFsbCIsImNsb3Nlc3QiLCJjaGFuZ2VGcmVxdWVuY3kiLCJjaGFuZ2VBbW91bnRQcmV2aWV3Iiwic2VsZWN0ZWQiLCJyYW5nZSIsIm1vbnRoX3ZhbHVlIiwieWVhcl92YWx1ZSIsIm9uY2VfdmFsdWUiLCJsZXZlbF9jbGFzcyJdLCJtYXBwaW5ncyI6Ijs7QUFBQSxDQUFDLFVBQVVBLE1BQU0s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bWlubnBvc3QtbWVtYmVyc2hpcC1mcm9udC1lbmQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gKHdpbmRvdykge1xuXHRmdW5jdGlvbiBNaW5uUG9zdE1lbWJlcnNoaXAoZGF0YSwgc2V0dGluZ3MpIHtcblx0XHR0aGlzLmRhdGEgPSB7fTtcblx0XHRpZiAodHlwZW9mIGRhdGEgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHR0aGlzLmRhdGEgPSBkYXRhO1xuXHRcdH1cblxuXHRcdHRoaXMuc2V0dGluZ3MgPSB7fTtcblx0XHRpZiAodHlwZW9mIHNldHRpbmdzICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0dGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuXHRcdH1cblxuXHRcdHRoaXMucHJldmlvdXNBbW91bnQgPSAnJztcblx0XHRpZiAoXG5cdFx0XHR0eXBlb2YgdGhpcy5kYXRhLmN1cnJlbnRfdXNlciAhPT0gJ3VuZGVmaW5lZCcgJiZcblx0XHRcdHR5cGVvZiB0aGlzLmRhdGEuY3VycmVudF91c2VyLnByZXZpb3VzX2Ftb3VudCAhPT0gJ3VuZGVmaW5lZCdcblx0XHQpIHtcblx0XHRcdHRoaXMucHJldmlvdXNBbW91bnQgPSB0aGlzLmRhdGEuY3VycmVudF91c2VyLnByZXZpb3VzX2Ftb3VudDtcblx0XHR9XG5cdH1cblxuXHRNaW5uUG9zdE1lbWJlcnNoaXAucHJvdG90eXBlID0ge1xuXHRcdGNoZWNrTGV2ZWwoYW1vdW50LCBmcmVxdWVuY3ksIHR5cGUpIHtcblx0XHRcdGxldCB0aGlzeWVhciA9IHBhcnNlSW50KGFtb3VudCkgKiBwYXJzZUludChmcmVxdWVuY3kpO1xuXHRcdFx0aWYgKFxuXHRcdFx0XHR0eXBlb2YgdGhpcy5wcmV2aW91c0Ftb3VudCAhPT0gJ3VuZGVmaW5lZCcgJiZcblx0XHRcdFx0dGhpcy5wcmV2aW91c0Ftb3VudCAhPT0gJydcblx0XHRcdCkge1xuXHRcdFx0XHRsZXQgcHJpb3JfeWVhcl9hbW91bnQgPSBwYXJzZUludChcblx0XHRcdFx0XHR0aGlzLnByZXZpb3VzQW1vdW50LnByaW9yX3llYXJfY29udHJpYnV0aW9ucyxcblx0XHRcdFx0XHQxMFxuXHRcdFx0XHQpO1xuXHRcdFx0XHRjb25zdCBjb21pbmdfeWVhcl9hbW91bnQgPSBwYXJzZUludChcblx0XHRcdFx0XHR0aGlzLnByZXZpb3VzQW1vdW50LmNvbWluZ195ZWFyX2NvbnRyaWJ1dGlvbnMsXG5cdFx0XHRcdFx0MTBcblx0XHRcdFx0KTtcblx0XHRcdFx0bGV0IGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ID0gcGFyc2VJbnQoXG5cdFx0XHRcdFx0dGhpcy5wcmV2aW91c0Ftb3VudC5hbm51YWxfcmVjdXJyaW5nX2Ftb3VudCxcblx0XHRcdFx0XHQxMFxuXHRcdFx0XHQpO1xuXHRcdFx0XHQvLyBjYWxjdWxhdGUgbWVtYmVyIGxldmVsIGZvcm11bGFcblx0XHRcdFx0aWYgKHR5cGUgPT09ICdvbmUtdGltZScpIHtcblx0XHRcdFx0XHRwcmlvcl95ZWFyX2Ftb3VudCArPSB0aGlzeWVhcjtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCArPSB0aGlzeWVhcjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHRoaXN5ZWFyID0gTWF0aC5tYXgoXG5cdFx0XHRcdFx0cHJpb3JfeWVhcl9hbW91bnQsXG5cdFx0XHRcdFx0Y29taW5nX3llYXJfYW1vdW50LFxuXHRcdFx0XHRcdGFubnVhbF9yZWN1cnJpbmdfYW1vdW50XG5cdFx0XHRcdCk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB0aGlzLmdldExldmVsKHRoaXN5ZWFyKTtcblx0XHR9LCAvLyBlbmQgY2hlY2tMZXZlbFxuXG5cdFx0Z2V0TGV2ZWwodGhpc3llYXIpIHtcblx0XHRcdGNvbnN0IGxldmVsID0ge1xuXHRcdFx0XHR5ZWFybHlBbW91bnQ6IHRoaXN5ZWFyLFxuXHRcdFx0fTtcblx0XHRcdGlmICh0aGlzeWVhciA+IDAgJiYgdGhpc3llYXIgPCA2MCkge1xuXHRcdFx0XHRsZXZlbC5uYW1lID0gJ0Jyb256ZSc7XG5cdFx0XHRcdGxldmVsLm51bWJlciA9IDE7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXN5ZWFyID4gNTkgJiYgdGhpc3llYXIgPCAxMjApIHtcblx0XHRcdFx0bGV2ZWwubmFtZSA9ICdTaWx2ZXInO1xuXHRcdFx0XHRsZXZlbC5udW1iZXIgPSAyO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDExOSAmJiB0aGlzeWVhciA8IDI0MCkge1xuXHRcdFx0XHRsZXZlbC5uYW1lID0gJ0dvbGQnO1xuXHRcdFx0XHRsZXZlbC5udW1iZXIgPSAzO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDIzOSkge1xuXHRcdFx0XHRsZXZlbC5uYW1lID0gJ1BsYXRpbnVtJztcblx0XHRcdFx0bGV2ZWwubnVtYmVyID0gNDtcblx0XHRcdH1cblx0XHRcdHJldHVybiBsZXZlbDtcblx0XHR9LCAvLyBlbmQgZ2V0TGV2ZWxcblx0fTtcblxuXHR3aW5kb3cuTWlublBvc3RNZW1iZXJzaGlwID0gbmV3IE1pbm5Qb3N0TWVtYmVyc2hpcChcblx0XHR3aW5kb3cubWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLFxuXHRcdHdpbmRvdy5taW5ucG9zdF9tZW1iZXJzaGlwX3NldHRpbmdzXG5cdCk7XG59KSh3aW5kb3cpO1xuIiwiLy8gcGx1Z2luXG4oZnVuY3Rpb24gKCQsIHdpbmRvdywgZG9jdW1lbnQsIE1pbm5Qb3N0TWVtYmVyc2hpcCkge1xuXHQvLyBDcmVhdGUgdGhlIGRlZmF1bHRzIG9uY2Vcblx0Y29uc3QgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdEFtb3VudFNlbGVjdCcsXG5cdFx0ZGVmYXVsdHMgPSB7XG5cdFx0XHRmcmVxdWVuY3lTZWxlY3RvcjogJy5tLWZyZXF1ZW5jeS1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRcdGFtb3VudEdyb3VwOiAnLm0tZnJlcXVlbmN5LWdyb3VwJyxcblx0XHRcdGFtb3VudFNlbGVjdG9yOiAnLm0tYW1vdW50LXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdFx0YW1vdW50TGFiZWxzOiAnLm0tYW1vdW50LXNlbGVjdCBsYWJlbCcsXG5cdFx0XHRhbW91bnRWYWx1ZTogJ3N0cm9uZycsXG5cdFx0XHRhbW91bnREZXNjcmlwdGlvbjogJy5hLWFtb3VudC1kZXNjcmlwdGlvbicsXG5cdFx0XHRhbW91bnRGaWVsZDogJy5hLWFtb3VudC1maWVsZCAjYW1vdW50Jyxcblx0XHRcdGN1c3RvbUFtb3VudEZyZXF1ZW5jeTogJyNhbW91bnQtaXRlbSAuYS1mcmVxdWVuY3ktdGV4dC1sYWJlbCcsXG5cdFx0XHRsZXZlbFZpZXdlcjogJy5hLXNob3ctbGV2ZWwnLFxuXHRcdFx0bGV2ZWxOYW1lOiAnLmEtbGV2ZWwnLFxuXHRcdFx0dXNlckN1cnJlbnRMZXZlbDogJy5hLWN1cnJlbnQtbGV2ZWwnLFxuXHRcdFx0ZGVjbGluZUJlbmVmaXRzOiAnLm0tZGVjbGluZS1iZW5lZml0cy1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRcdGdpZnRTZWxlY3Rpb25Hcm91cDogJy5tLW1lbWJlcnNoaXAtZ2lmdC1zZWxlY3RvcicsXG5cdFx0XHRnaWZ0TGV2ZWw6ICcubS1naWZ0LWxldmVsJyxcblx0XHRcdGdpZnRTZWxlY3RvcjogJy5tLWdpZnQtbGV2ZWwgLm0tZm9ybS1pdGVtIGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0XHRnaWZ0T3B0aW9uU2VsZWN0b3I6ICcuYS1naWZ0LW9wdGlvbi1zZWxlY3QnLFxuXHRcdFx0Z2lmdExhYmVsOiAnLm0tZ2lmdC1sZXZlbCAubS1mb3JtLWl0ZW0gaW5wdXRbdHlwZT1cInJhZGlvXCJdICsgbGFiZWwnLFxuXHRcdFx0c3dhZ0VsaWdpYmlsaXR5VGV4dDpcblx0XHRcdFx0Jy5tLW1lbWJlcnNoaXAtZ2lmdC1zZWxlY3RvciAuc3dhZy1lbGlnaWJpbGl0eScsXG5cdFx0XHRzd2FnU2VsZWN0b3I6ICcubS1zZWxlY3Qtc3dhZyBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdFx0c3dhZ0xhYmVsczogJy5tLXNlbGVjdC1zd2FnIGlucHV0W3R5cGU9XCJyYWRpb1wiXSArIGxhYmVsJyxcblx0XHRcdG1pbkFtb3VudHM6ICcubS1tZW1iZXJzaGlwLWdpZnQtc2VsZWN0b3IgLm1pbi1hbW91bnQnLFxuXHRcdFx0ZGVjbGluZUdpZnRMZXZlbDogJy5tLWRlY2xpbmUtbGV2ZWwnLFxuXHRcdH07XG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKGVsZW1lbnQsIG9wdGlvbnMpIHtcblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIGRlZmF1bHRzLCBvcHRpb25zKTtcblxuXHRcdHRoaXMuX2RlZmF1bHRzID0gZGVmYXVsdHM7XG5cdFx0dGhpcy5fbmFtZSA9IHBsdWdpbk5hbWU7XG5cblx0XHR0aGlzLmluaXQoKTtcblx0fSAvLyBlbmQgY29uc3RydWN0b3JcblxuXHRQbHVnaW4ucHJvdG90eXBlID0ge1xuXHRcdGluaXQoKSB7XG5cdFx0XHRjb25zdCAkZnJlcXVlbmN5ID0gJCh0aGlzLmVsZW1lbnQpLmZpbmQoXG5cdFx0XHRcdHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvclxuXHRcdFx0KTtcblx0XHRcdGNvbnN0ICRmb3JtID0gJCh0aGlzLmVsZW1lbnQpO1xuXHRcdFx0Y29uc3QgJHN1Z2dlc3RlZEFtb3VudCA9ICQodGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yKTtcblx0XHRcdGNvbnN0ICRhbW91bnQgPSAkKHRoaXMuZWxlbWVudCkuZmluZCh0aGlzLm9wdGlvbnMuYW1vdW50RmllbGQpO1xuXHRcdFx0Y29uc3QgJGRlY2xpbmVCZW5lZml0cyA9ICQodGhpcy5lbGVtZW50KS5maW5kKFxuXHRcdFx0XHR0aGlzLm9wdGlvbnMuZGVjbGluZUJlbmVmaXRzXG5cdFx0XHQpO1xuXHRcdFx0Y29uc3QgJGdpZnRzID0gJCh0aGlzLmVsZW1lbnQpLmZpbmQodGhpcy5vcHRpb25zLmdpZnRTZWxlY3Rvcik7XG5cdFx0XHRpZiAoXG5cdFx0XHRcdCEoXG5cdFx0XHRcdFx0JGFtb3VudC5sZW5ndGggPiAwICYmXG5cdFx0XHRcdFx0JGZyZXF1ZW5jeS5sZW5ndGggPiAwICYmXG5cdFx0XHRcdFx0JHN1Z2dlc3RlZEFtb3VudC5sZW5ndGggPiAwXG5cdFx0XHRcdClcblx0XHRcdCkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIFNldCB1cCB0aGUgVUkgZm9yIHRoZSBjdXJyZW50IGZpZWxkIHN0YXRlIG9uIChyZS0pbG9hZFxuXHRcdFx0dGhpcy5zZXRBbW91bnRMYWJlbHMoJGZyZXF1ZW5jeS5maWx0ZXIoJzpjaGVja2VkJykudmFsKCkpO1xuXHRcdFx0dGhpcy5zZXRNaW5BbW91bnRzKCRmcmVxdWVuY3kuZmlsdGVyKCc6Y2hlY2tlZCcpLnZhbCgpKTtcblx0XHRcdHRoaXMuY2hlY2tBbmRTZXRMZXZlbChmYWxzZSk7XG5cblx0XHRcdCRmcmVxdWVuY3kub24oJ2NoYW5nZScsIHRoaXMub25GcmVxdWVuY3lDaGFuZ2UuYmluZCh0aGlzKSk7XG5cdFx0XHQkc3VnZ2VzdGVkQW1vdW50Lm9uKFxuXHRcdFx0XHQnY2hhbmdlJyxcblx0XHRcdFx0dGhpcy5vblN1Z2dlc3RlZEFtb3VudENoYW5nZS5iaW5kKHRoaXMpXG5cdFx0XHQpO1xuXHRcdFx0JGFtb3VudC5vbigna2V5dXAgbW91c2V1cCcsIHRoaXMub25BbW91bnRDaGFuZ2UuYmluZCh0aGlzKSk7XG5cblx0XHRcdGlmICghKCRkZWNsaW5lQmVuZWZpdHMubGVuZ3RoID4gMCAmJiAkZ2lmdHMubGVuZ3RoID4gMCkpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBTZXQgdXAgdGhlIFVJIGZvciB0aGUgY3VycmVudCBmaWVsZCBzdGF0ZSBvbiAocmUtKWxvYWRcblx0XHRcdGlmICgkZ2lmdHMubm90KHRoaXMub3B0aW9ucy5kZWNsaW5lR2lmdExldmVsKS5pcygnOmNoZWNrZWQnKSkge1xuXHRcdFx0XHQkKHRoaXMuZWxlbWVudClcblx0XHRcdFx0XHQuZmluZCh0aGlzLm9wdGlvbnMuZGVjbGluZUdpZnRMZXZlbClcblx0XHRcdFx0XHQucHJvcCgnY2hlY2tlZCcsIGZhbHNlKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5vbkRlY2xpbmVCZW5lZml0c0NoYW5nZSgpO1xuXHRcdFx0dGhpcy5naWZ0T3B0aW9uU2VsZWN0KCk7XG5cdFx0XHR0aGlzLnNldFJlcXVpcmVkRmllbGRzKCRnaWZ0cyk7XG5cblx0XHRcdCRkZWNsaW5lQmVuZWZpdHMub24oXG5cdFx0XHRcdCdjaGFuZ2UnLFxuXHRcdFx0XHR0aGlzLm9uRGVjbGluZUJlbmVmaXRzQ2hhbmdlLmJpbmQodGhpcylcblx0XHRcdCk7XG5cdFx0XHQkZ2lmdHMub24oJ2NsaWNrJywgdGhpcy5vbkdpZnRzQ2xpY2suYmluZCh0aGlzKSk7XG5cblx0XHRcdC8vIGJlY2F1c2UgdGhlIG5leHQgdXJsIGlzIGdlbmVyYXRlZCBieSBXb3JkUHJlc3MgYmFzZWQgb24gd2hhdCB0aGUgSmF2YVNjcmlwdCBkb2VzLFxuXHRcdFx0Ly8gd2Ugc2hvdWxkIGFsc28gdXNlIHRoZSBKYXZhU2NyaXB0IHRvIHJ1biBhIGZvcm0gc3VibWl0IHdoZW4gdGhhdCBsaW5rIGlzIGNsaWNrZWQuXG5cdFx0XHRjb25zdCBmb3JtID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm0tZm9ybS1tZW1iZXJzaGlwJyk7XG5cdFx0XHRjb25zdCBuYXZGb3JTdWJtaXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYS1wYXktdXJsJyk7XG5cdFx0XHRuYXZGb3JTdWJtaXQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdFx0Zm9ybS5zdWJtaXQoKTtcblx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdH0pO1xuXG5cdFx0XHQvLyB3aGVuIHRoZSBmb3JtIGlzIHN1Ym1pdHRlZFxuXHRcdFx0ZG9jdW1lbnRcblx0XHRcdFx0LnF1ZXJ5U2VsZWN0b3JBbGwoJy5tLWZvcm0tbWVtYmVyc2hpcCcpXG5cdFx0XHRcdC5mb3JFYWNoKChtZW1iZXJzaGlwRm9ybSkgPT5cblx0XHRcdFx0XHRtZW1iZXJzaGlwRm9ybS5hZGRFdmVudExpc3RlbmVyKCdzdWJtaXQnLCAoZXZlbnQpID0+IHtcblx0XHRcdFx0XHRcdHRoaXMub25Gb3JtU3VibWl0KGV2ZW50KTtcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHQpO1xuXHRcdH0sIC8vIGVuZCBpbml0XG5cblx0XHQvKlxuXHRcdCAqIHJ1biBhbiBhbmFseXRpY3MgcHJvZHVjdCBhY3Rpb25cblx0XHQgKi9cblx0XHRhbmFseXRpY3NQcm9kdWN0QWN0aW9uKGxldmVsLCBhbW91bnQsIGZyZXF1ZW5jeV9sYWJlbCwgYWN0aW9uLCBzdGVwKSB7XG5cdFx0XHRjb25zdCBwcm9kdWN0ID0gdGhpcy5hbmFseXRpY3NQcm9kdWN0KFxuXHRcdFx0XHRsZXZlbCxcblx0XHRcdFx0YW1vdW50LFxuXHRcdFx0XHRmcmVxdWVuY3lfbGFiZWxcblx0XHRcdCk7XG5cdFx0XHR3cC5ob29rcy5kb0FjdGlvbihcblx0XHRcdFx0J21pbm5wb3N0TWVtYmVyc2hpcEFuYWx5dGljc0Vjb21tZXJjZUFjdGlvbicsXG5cdFx0XHRcdCdldmVudCcsXG5cdFx0XHRcdGFjdGlvbixcblx0XHRcdFx0cHJvZHVjdCxcblx0XHRcdFx0c3RlcFxuXHRcdFx0KTtcblx0XHR9LCAvLyBlbmQgYW5hbHl0aWNzUHJvZHVjdEFjdGlvblxuXG5cdFx0LyoqXG5cdFx0ICogUnVuIGEgZGF0YUxheWVyIHByb2R1Y3QgYWN0aW9uXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gIGxldmVsXG5cdFx0ICogQHBhcmFtICBhbW91bnRcblx0XHQgKiBAcGFyYW0gIGZyZXF1ZW5jeV9sYWJlbFxuXHRcdCAqIEBwYXJhbSAgYWN0aW9uXG5cdFx0ICovXG5cdFx0ZGF0YUxheWVyUHJvZHVjdEFjdGlvbihsZXZlbCwgYW1vdW50LCBmcmVxdWVuY3lfbGFiZWwsIGFjdGlvbikge1xuXHRcdFx0aWYgKHR5cGVvZiB3cCAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdFx0Y29uc3QgcHJvZHVjdCA9IHRoaXMuYW5hbHl0aWNzUHJvZHVjdChcblx0XHRcdFx0XHRsZXZlbCxcblx0XHRcdFx0XHRhbW91bnQsXG5cdFx0XHRcdFx0ZnJlcXVlbmN5X2xhYmVsXG5cdFx0XHRcdCk7XG5cdFx0XHRcdGNvbnN0IGRhdGFMYXllckNvbnRlbnQgPSB7XG5cdFx0XHRcdFx0YWN0aW9uLFxuXHRcdFx0XHRcdHByb2R1Y3QsXG5cdFx0XHRcdH07XG5cdFx0XHRcdHdwLmhvb2tzLmRvQWN0aW9uKFxuXHRcdFx0XHRcdCdtaW5ucG9zdE1lbWJlcnNoaXBEYXRhTGF5ZXJFY29tbWVyY2VBY3Rpb24nLFxuXHRcdFx0XHRcdGRhdGFMYXllckNvbnRlbnRcblx0XHRcdFx0KTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgZGF0YUxheWVyUHJvZHVjdEFjdGlvblxuXG5cdFx0Lypcblx0XHQgKiBydW4gYW4gYW5hbHl0aWNzIGNhcnQgYWN0aW9uXG5cdFx0ICovXG5cdFx0YW5hbHl0aWNzQ2FydEFjdGlvbihsZXZlbCwgYW1vdW50LCBmcmVxdWVuY3lfbGFiZWwpIHtcblx0XHRcdGNvbnN0IHByb2R1Y3QgPSB0aGlzLmFuYWx5dGljc1Byb2R1Y3QoXG5cdFx0XHRcdGxldmVsLm5hbWUsXG5cdFx0XHRcdGFtb3VudCxcblx0XHRcdFx0ZnJlcXVlbmN5X2xhYmVsXG5cdFx0XHQpO1xuXHRcdFx0d3AuaG9va3MuZG9BY3Rpb24oXG5cdFx0XHRcdCdtaW5ucG9zdE1lbWJlcnNoaXBBbmFseXRpY3NFY29tbWVyY2VBY3Rpb24nLFxuXHRcdFx0XHQnZXZlbnQnLFxuXHRcdFx0XHQnYWRkX3RvX2NhcnQnLFxuXHRcdFx0XHRwcm9kdWN0XG5cdFx0XHQpO1xuXHRcdFx0d3AuaG9va3MuZG9BY3Rpb24oXG5cdFx0XHRcdCdtaW5ucG9zdE1lbWJlcnNoaXBBbmFseXRpY3NFY29tbWVyY2VBY3Rpb24nLFxuXHRcdFx0XHQnZXZlbnQnLFxuXHRcdFx0XHQnYmVnaW5fY2hlY2tvdXQnLFxuXHRcdFx0XHRwcm9kdWN0XG5cdFx0XHQpO1xuXHRcdH0sIC8vIGVuZCBhbmFseXRpY3NDYXJ0QWN0aW9uXG5cblx0XHQvKlxuXHRcdCAqIHJ1biBhbiBkYXRhTGF5ZXIgY2FydCBhY3Rpb25cblx0XHQgKi9cblx0XHRkYXRhTGF5ZXJDYXJ0QWN0aW9uKGxldmVsLCBhbW91bnQsIGZyZXF1ZW5jeV9sYWJlbCkge1xuXHRcdFx0Y29uc3QgcHJvZHVjdCA9IHRoaXMuYW5hbHl0aWNzUHJvZHVjdChcblx0XHRcdFx0bGV2ZWwubmFtZSxcblx0XHRcdFx0YW1vdW50LFxuXHRcdFx0XHRmcmVxdWVuY3lfbGFiZWxcblx0XHRcdCk7XG5cdFx0XHRjb25zdCBkYXRhTGF5ZXJBZGRUb0NhcnQgPSB7XG5cdFx0XHRcdGFjdGlvbjogJ2FkZF90b19jYXJ0Jyxcblx0XHRcdFx0cHJvZHVjdCxcblx0XHRcdH07XG5cdFx0XHR3cC5ob29rcy5kb0FjdGlvbihcblx0XHRcdFx0J21pbm5wb3N0TWVtYmVyc2hpcERhdGFMYXllckVjb21tZXJjZUFjdGlvbicsXG5cdFx0XHRcdGRhdGFMYXllckFkZFRvQ2FydFxuXHRcdFx0KTtcblx0XHRcdGNvbnN0IGRhdGFMYXllckJlZ2luQ2hlY2tvdXQgPSB7XG5cdFx0XHRcdGFjdGlvbjogJ2JlZ2luX2NoZWNrb3V0Jyxcblx0XHRcdFx0cHJvZHVjdCxcblx0XHRcdH07XG5cdFx0XHR3cC5ob29rcy5kb0FjdGlvbihcblx0XHRcdFx0J21pbm5wb3N0TWVtYmVyc2hpcERhdGFMYXllckVjb21tZXJjZUFjdGlvbicsXG5cdFx0XHRcdGRhdGFMYXllckJlZ2luQ2hlY2tvdXRcblx0XHRcdCk7XG5cdFx0fSwgLy8gZW5kIGRhdGFMYXllckNhcnRBY3Rpb25cblxuXHRcdC8qXG5cdFx0ICogY3JlYXRlIGFuIGFuYWx5dGljcyBwcm9kdWN0IHZhcmlhYmxlXG5cdFx0ICovXG5cdFx0YW5hbHl0aWNzUHJvZHVjdChsZXZlbCwgYW1vdW50LCBmcmVxdWVuY3lfbGFiZWwpIHtcblx0XHRcdGNvbnN0IHByb2R1Y3QgPSB7XG5cdFx0XHRcdGl0ZW1faWQ6ICdtaW5ucG9zdF8nICsgbGV2ZWwudG9Mb3dlckNhc2UoKSArICdfbWVtYmVyc2hpcCcsXG5cdFx0XHRcdGl0ZW1fbmFtZTpcblx0XHRcdFx0XHQnTWlublBvc3QgJyArXG5cdFx0XHRcdFx0bGV2ZWwuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgK1xuXHRcdFx0XHRcdGxldmVsLnNsaWNlKDEpICtcblx0XHRcdFx0XHQnIE1lbWJlcnNoaXAnLFxuXHRcdFx0XHRpdGVtX2NhdGVnb3J5OiAnRG9uYXRpb24nLFxuXHRcdFx0XHRpdGVtX2JyYW5kOiAnTWlublBvc3QnLFxuXHRcdFx0XHRpdGVtX3ZhcmlhbnQ6IGZyZXF1ZW5jeV9sYWJlbCxcblx0XHRcdFx0cHJpY2U6IGFtb3VudCxcblx0XHRcdFx0cXVhbnRpdHk6IDEsXG5cdFx0XHR9O1xuXHRcdFx0cmV0dXJuIHByb2R1Y3Q7XG5cdFx0fSwgLy8gZW5kIGFuYWx5dGljc1Byb2R1Y3RcblxuXHRcdG9uRnJlcXVlbmN5Q2hhbmdlKGV2ZW50KSB7XG5cdFx0XHR0aGlzLnNldEFtb3VudExhYmVscygkKGV2ZW50LnRhcmdldCkudmFsKCkpO1xuXHRcdFx0dGhpcy5zZXRNaW5BbW91bnRzKCQoZXZlbnQudGFyZ2V0KS52YWwoKSk7XG5cdFx0XHR0aGlzLmNoZWNrQW5kU2V0TGV2ZWwodHJ1ZSk7XG5cdFx0fSwgLy8gZW5kIG9uRnJlcXVlbmN5Q2hhbmdlXG5cblx0XHRvblN1Z2dlc3RlZEFtb3VudENoYW5nZShldmVudCkge1xuXHRcdFx0JCh0aGlzLmVsZW1lbnQpLmZpbmQodGhpcy5vcHRpb25zLmFtb3VudEZpZWxkKS52YWwobnVsbCk7XG5cdFx0XHR0aGlzLmNoZWNrQW5kU2V0TGV2ZWwodHJ1ZSk7XG5cdFx0fSwgLy8gZW5kIG9uU3VnZ2VzdGVkQW1vdW50Q2hhbmdlXG5cblx0XHRvbkFtb3VudENoYW5nZShldmVudCkge1xuXHRcdFx0dGhpcy5jbGVhckFtb3VudFNlbGVjdG9yKGV2ZW50KTtcblxuXHRcdFx0Y29uc3QgJHRhcmdldCA9ICQoZXZlbnQudGFyZ2V0KTtcblx0XHRcdGlmICgkdGFyZ2V0LmRhdGEoJ2xhc3QtdmFsdWUnKSAhPSAkdGFyZ2V0LnZhbCgpKSB7XG5cdFx0XHRcdCR0YXJnZXQuZGF0YSgnbGFzdC12YWx1ZScsICR0YXJnZXQudmFsKCkpO1xuXHRcdFx0XHR0aGlzLmNoZWNrQW5kU2V0TGV2ZWwodHJ1ZSk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIG9uQW1vdW50Q2hhbmdlXG5cblx0XHRvbkRlY2xpbmVCZW5lZml0c0NoYW5nZShldmVudCkge1xuXHRcdFx0Y29uc3QgJGdpZnRTZWxlY3Rpb25Hcm91cCA9ICQodGhpcy5lbGVtZW50KS5maW5kKFxuXHRcdFx0XHR0aGlzLm9wdGlvbnMuZ2lmdFNlbGVjdGlvbkdyb3VwXG5cdFx0XHQpO1xuXHRcdFx0Y29uc3QgZGVjbGluZSA9ICQodGhpcy5lbGVtZW50KVxuXHRcdFx0XHQuZmluZCh0aGlzLm9wdGlvbnMuZGVjbGluZUJlbmVmaXRzKVxuXHRcdFx0XHQuZmlsdGVyKCc6Y2hlY2tlZCcpXG5cdFx0XHRcdC52YWwoKTtcblxuXHRcdFx0aWYgKGRlY2xpbmUgPT09ICd0cnVlJykge1xuXHRcdFx0XHQkZ2lmdFNlbGVjdGlvbkdyb3VwLmhpZGUoKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQkZ2lmdFNlbGVjdGlvbkdyb3VwLnNob3coKTtcblx0XHR9LCAvLyBlbmQgb25EZWNsaW5lQmVuZWZpdHNDaGFuZ2VcblxuXHRcdGdpZnRPcHRpb25TZWxlY3QoKSB7XG5cdFx0XHRjb25zdCBwYXJlbnQgPSAkKHRoaXMub3B0aW9ucy5naWZ0T3B0aW9uU2VsZWN0b3IpXG5cdFx0XHRcdC5wYXJlbnQoKVxuXHRcdFx0XHQucGFyZW50KClcblx0XHRcdFx0LmZpbmQoJ2lucHV0W3R5cGU9XCJyYWRpb1wiXScpO1xuXHRcdFx0JCh0aGlzLm9wdGlvbnMuZ2lmdE9wdGlvblNlbGVjdG9yKS5jaGFuZ2UoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRjb25zdCBzZWxlY3RlZE9wdGlvbiA9ICQodGhpcylcblx0XHRcdFx0XHQuY2hpbGRyZW4oJ29wdGlvbjpzZWxlY3RlZCcpXG5cdFx0XHRcdFx0LnZhbCgpO1xuXHRcdFx0XHRpZiAoJycgIT09IHNlbGVjdGVkT3B0aW9uKSB7XG5cdFx0XHRcdFx0cGFyZW50LnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSwgLy8gZW5kIGdpZnRPcHRpb25TZWxlY3RcblxuXHRcdG9uR2lmdHNDbGljayhldmVudCkge1xuXHRcdFx0Y29uc3QgJGdpZnRzID0gJCh0aGlzLmVsZW1lbnQpXG5cdFx0XHRcdC5maW5kKHRoaXMub3B0aW9ucy5naWZ0U2VsZWN0b3IpXG5cdFx0XHRcdC5ub3QodGhpcy5vcHRpb25zLmRlY2xpbmVHaWZ0TGV2ZWwpO1xuXHRcdFx0Y29uc3QgJGRlY2xpbmUgPSAkKHRoaXMuZWxlbWVudCkuZmluZChcblx0XHRcdFx0dGhpcy5vcHRpb25zLmRlY2xpbmVHaWZ0TGV2ZWxcblx0XHRcdCk7XG5cdFx0XHRpZiAoJChldmVudC50YXJnZXQpLmlzKHRoaXMub3B0aW9ucy5kZWNsaW5lR2lmdExldmVsKSkge1xuXHRcdFx0XHQkZ2lmdHMucHJvcCgnY2hlY2tlZCcsIGZhbHNlKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5zZXRSZXF1aXJlZEZpZWxkcygkZ2lmdHMpO1xuXHRcdFx0JGRlY2xpbmUucHJvcCgnY2hlY2tlZCcsIGZhbHNlKTtcblx0XHR9LCAvLyBlbmQgb25HaWZ0c0NsaWNrXG5cblx0XHRzZXRSZXF1aXJlZEZpZWxkcygkZ2lmdHMpIHtcblx0XHRcdGNvbnN0ICRjaGVja2VkR2lmdHMgPSAkZ2lmdHMuZmlsdGVyKCc6Y2hlY2tlZCcpO1xuXHRcdFx0aWYgKCRjaGVja2VkR2lmdHMpIHtcblx0XHRcdFx0JChcIltkYXRhLXJlcXVpcmVkPSd0cnVlJ11cIikucHJvcCgncmVxdWlyZWQnLCBmYWxzZSk7XG5cdFx0XHRcdCRjaGVja2VkR2lmdHMuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Y29uc3Qgc2V0UmVxdWlyZWQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHQkKHRoaXMpLnByb3AoJ3JlcXVpcmVkJywgdHJ1ZSk7XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0XHQkKFwiW2RhdGEtcmVxdWlyZWQ9J3RydWUnXVwiLCAkKHRoaXMpLnBhcmVudCgpKS5lYWNoKFxuXHRcdFx0XHRcdFx0c2V0UmVxdWlyZWRcblx0XHRcdFx0XHQpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgc2V0UmVxdWlyZWRGaWVsZHNcblxuXHRcdG9uRm9ybVN1Ym1pdChldmVudCkge1xuXHRcdFx0bGV0IGFtb3VudCA9ICQodGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yKVxuXHRcdFx0XHQuZmlsdGVyKCc6Y2hlY2tlZCcpXG5cdFx0XHRcdC52YWwoKTtcblx0XHRcdGlmICh0eXBlb2YgYW1vdW50ID09PSAndW5kZWZpbmVkJykge1xuXHRcdFx0XHRhbW91bnQgPSAkKHRoaXMub3B0aW9ucy5hbW91bnRGaWVsZCkudmFsKCk7XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBmcmVxdWVuY3lfc3RyaW5nID0gJChcblx0XHRcdFx0dGhpcy5vcHRpb25zLmZyZXF1ZW5jeVNlbGVjdG9yICsgJzpjaGVja2VkJ1xuXHRcdFx0KS52YWwoKTtcblx0XHRcdGNvbnN0IGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0Y29uc3QgZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdGNvbnN0IGZyZXF1ZW5jeV9pZCA9ICQoXG5cdFx0XHRcdHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvciArICc6Y2hlY2tlZCdcblx0XHRcdCkucHJvcCgnaWQnKTtcblx0XHRcdGNvbnN0IGZyZXF1ZW5jeV9sYWJlbCA9ICQoXG5cdFx0XHRcdCdsYWJlbFtmb3I9XCInICsgZnJlcXVlbmN5X2lkICsgJ1wiXSdcblx0XHRcdCkudGV4dCgpO1xuXHRcdFx0Y29uc3QgbGV2ZWwgPSBNaW5uUG9zdE1lbWJlcnNoaXAuY2hlY2tMZXZlbChcblx0XHRcdFx0YW1vdW50LFxuXHRcdFx0XHRmcmVxdWVuY3ksXG5cdFx0XHRcdGZyZXF1ZW5jeV9uYW1lXG5cdFx0XHQpO1xuXG5cdFx0XHRjb25zdCBvcHRpb25zID0ge1xuXHRcdFx0XHR0eXBlOiAnZXZlbnQnLFxuXHRcdFx0XHRjYXRlZ29yeTogJ1N1cHBvcnQgVXMnLFxuXHRcdFx0XHRhY3Rpb246ICdCZWNvbWUgQSBNZW1iZXInLFxuXHRcdFx0XHRsYWJlbDogbG9jYXRpb24ucGF0aG5hbWUsXG5cdFx0XHR9O1xuXHRcdFx0Ly8gdGhpcyB0cmFja3MgYW4gZXZlbnQgc3VibWlzc2lvbiBiYXNlZCBvbiB0aGUgcGx1Z2luIG9wdGlvbnNcblx0XHRcdC8vIGl0IGFsc28gYnViYmxlcyB0aGUgZXZlbnQgdXAgdG8gc3VibWl0IHRoZSBmb3JtXG5cdFx0XHQvLyBndG0gY2FuIGRldGVjdCB0aGUgZm9ybSBzdWJtaXNzaW9uIGl0c2VsZi5cblx0XHRcdHdwLmhvb2tzLmRvQWN0aW9uKFxuXHRcdFx0XHQnbWlubnBvc3RNZW1iZXJzaGlwQW5hbHl0aWNzRXZlbnQnLFxuXHRcdFx0XHRvcHRpb25zLnR5cGUsXG5cdFx0XHRcdG9wdGlvbnMuY2F0ZWdvcnksXG5cdFx0XHRcdG9wdGlvbnMuYWN0aW9uLFxuXHRcdFx0XHRvcHRpb25zLmxhYmVsXG5cdFx0XHQpO1xuXHRcdFx0Y29uc3QgaGFzQ2xhc3MgPSBldmVudC50YXJnZXQuY2xhc3NMaXN0LmNvbnRhaW5zKFxuXHRcdFx0XHQnbS1mb3JtLW1lbWJlcnNoaXAtc3VwcG9ydCdcblx0XHRcdCk7XG5cdFx0XHQvLyBpZiB0aGlzIGlzIHRoZSBtYWluIGNoZWNrb3V0IGZvcm0sIHNlbmQgaXQgdG8gdGhlIGVjIHBsdWdpbiBvciBndG0gYXMgYSBjaGVja291dFxuXHRcdFx0aWYgKGhhc0NsYXNzKSB7XG5cdFx0XHRcdHRoaXMuYW5hbHl0aWNzQ2FydEFjdGlvbihsZXZlbCwgYW1vdW50LCBmcmVxdWVuY3lfbGFiZWwpO1xuXHRcdFx0XHR0aGlzLmRhdGFMYXllckNhcnRBY3Rpb24obGV2ZWwsIGFtb3VudCwgZnJlcXVlbmN5X2xhYmVsKTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgb25Gb3JtU3VibWl0XG5cblx0XHRjbGVhckFtb3VudFNlbGVjdG9yKGV2ZW50KSB7XG5cdFx0XHRjb25zdCAkc3VnZ2VzdGVkQW1vdW50ID0gJCh0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IpO1xuXG5cdFx0XHRpZiAoJChldmVudC50YXJnZXQpLnZhbCgpID09PSAnJykge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdCRzdWdnZXN0ZWRBbW91bnQucHJvcCgnY2hlY2tlZCcsIGZhbHNlKTtcblx0XHR9LCAvLyBlbmQgY2xlYXJBbW91bnRTZWxlY3RvclxuXG5cdFx0c2V0QW1vdW50TGFiZWxzKGZyZXF1ZW5jeVN0cmluZykge1xuXHRcdFx0Y29uc3QgJGdyb3VwcyA9ICQodGhpcy5vcHRpb25zLmFtb3VudEdyb3VwKTtcblx0XHRcdGNvbnN0ICRzZWxlY3RlZCA9ICQodGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yKS5maWx0ZXIoJzpjaGVja2VkJyk7XG5cdFx0XHRjb25zdCBpbmRleCA9ICRzZWxlY3RlZC5kYXRhKCdpbmRleCcpO1xuXHRcdFx0Y29uc3QgJGN1c3RvbUFtb3VudEZyZXF1ZW5jeSA9ICQoXG5cdFx0XHRcdHRoaXMub3B0aW9ucy5jdXN0b21BbW91bnRGcmVxdWVuY3lcblx0XHRcdCk7XG5cblx0XHRcdCRncm91cHMucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdFx0JGdyb3Vwc1xuXHRcdFx0XHQuZmlsdGVyKCdbZGF0YS1mcmVxdWVuY3k9XCInICsgZnJlcXVlbmN5U3RyaW5nICsgJ1wiXScpXG5cdFx0XHRcdC5hZGRDbGFzcygnYWN0aXZlJyk7XG5cdFx0XHQkc2VsZWN0ZWQucHJvcCgnY2hlY2tlZCcsIGZhbHNlKTtcblx0XHRcdCRncm91cHNcblx0XHRcdFx0LmZpbHRlcignLmFjdGl2ZScpXG5cdFx0XHRcdC5maW5kKCdpbnB1dFt0eXBlPVwicmFkaW9cIl1bZGF0YS1pbmRleD1cIicgKyBpbmRleCArICdcIl0nKVxuXHRcdFx0XHQucHJvcCgnY2hlY2tlZCcsIHRydWUpO1xuXG5cdFx0XHRjb25zdCBjdXJyZW50RnJlcXVlbmN5TGFiZWwgPSAkZ3JvdXBzXG5cdFx0XHRcdC5maWx0ZXIoJy5hY3RpdmUnKVxuXHRcdFx0XHQuZmluZCgnLmEtZnJlcXVlbmN5LXRleHQtbGFiZWwnKVxuXHRcdFx0XHQuZmlyc3QoKVxuXHRcdFx0XHQudGV4dCgpO1xuXHRcdFx0JGN1c3RvbUFtb3VudEZyZXF1ZW5jeS50ZXh0KGN1cnJlbnRGcmVxdWVuY3lMYWJlbCk7XG5cdFx0fSwgLy8gZW5kIHNldEFtb3VudExhYmVsc1xuXG5cdFx0c2V0TWluQW1vdW50cyhmcmVxdWVuY3lTdHJpbmcpIHtcblx0XHRcdGNvbnN0ICRlbGVtZW50cyA9ICQodGhpcy5vcHRpb25zLm1pbkFtb3VudHMpO1xuXHRcdFx0JGVsZW1lbnRzLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcblx0XHRcdCRlbGVtZW50c1xuXHRcdFx0XHQuZmlsdGVyKCdbZGF0YS1mcmVxdWVuY3k9XCInICsgZnJlcXVlbmN5U3RyaW5nICsgJ1wiXScpXG5cdFx0XHRcdC5hZGRDbGFzcygnYWN0aXZlJyk7XG5cdFx0fSwgLy8gZW5kIHNldE1pbkFtb3VudHNcblxuXHRcdGNoZWNrQW5kU2V0TGV2ZWwodXBkYXRlZCkge1xuXHRcdFx0bGV0IGFtb3VudCA9ICQodGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yKVxuXHRcdFx0XHQuZmlsdGVyKCc6Y2hlY2tlZCcpXG5cdFx0XHRcdC52YWwoKTtcblx0XHRcdGlmICh0eXBlb2YgYW1vdW50ID09PSAndW5kZWZpbmVkJykge1xuXHRcdFx0XHRhbW91bnQgPSAkKHRoaXMub3B0aW9ucy5hbW91bnRGaWVsZCkudmFsKCk7XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IGZyZXF1ZW5jeV9zdHJpbmcgPSAkKFxuXHRcdFx0XHR0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKyAnOmNoZWNrZWQnXG5cdFx0XHQpLnZhbCgpO1xuXHRcdFx0Y29uc3QgZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRjb25zdCBmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0Y29uc3QgZnJlcXVlbmN5X2lkID0gJChcblx0XHRcdFx0dGhpcy5vcHRpb25zLmZyZXF1ZW5jeVNlbGVjdG9yICsgJzpjaGVja2VkJ1xuXHRcdFx0KS5wcm9wKCdpZCcpO1xuXHRcdFx0Y29uc3QgZnJlcXVlbmN5X2xhYmVsID0gJChcblx0XHRcdFx0J2xhYmVsW2Zvcj1cIicgKyBmcmVxdWVuY3lfaWQgKyAnXCJdJ1xuXHRcdFx0KS50ZXh0KCk7XG5cblx0XHRcdGNvbnN0IGxldmVsID0gTWlublBvc3RNZW1iZXJzaGlwLmNoZWNrTGV2ZWwoXG5cdFx0XHRcdGFtb3VudCxcblx0XHRcdFx0ZnJlcXVlbmN5LFxuXHRcdFx0XHRmcmVxdWVuY3lfbmFtZVxuXHRcdFx0KTtcblx0XHRcdHRoaXMuc2hvd05ld0xldmVsKHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zLCBsZXZlbCk7XG5cdFx0XHR0aGlzLnNldEVuYWJsZWRHaWZ0cyhsZXZlbCk7XG5cdFx0XHR0aGlzLmFuYWx5dGljc1Byb2R1Y3RBY3Rpb24oXG5cdFx0XHRcdGxldmVsLm5hbWUsXG5cdFx0XHRcdGFtb3VudCxcblx0XHRcdFx0ZnJlcXVlbmN5X2xhYmVsLFxuXHRcdFx0XHQnc2VsZWN0X2NvbnRlbnQnLFxuXHRcdFx0XHQxXG5cdFx0XHQpO1xuXHRcdFx0dGhpcy5kYXRhTGF5ZXJQcm9kdWN0QWN0aW9uKFxuXHRcdFx0XHRsZXZlbC5uYW1lLFxuXHRcdFx0XHRhbW91bnQsXG5cdFx0XHRcdGZyZXF1ZW5jeV9sYWJlbCxcblx0XHRcdFx0J3NlbGVjdF9pdGVtJ1xuXHRcdFx0KTtcblx0XHR9LCAvLyBlbmQgY2hlY2tBbmRTZXRMZXZlbFxuXG5cdFx0c2hvd05ld0xldmVsKGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsKSB7XG5cdFx0XHRsZXQgbWVtYmVyX2xldmVsX3ByZWZpeCA9ICcnO1xuXHRcdFx0bGV0IG9sZF9sZXZlbCA9ICcnO1xuXHRcdFx0bGV0IGxldmVsVmlld2VyQ29udGFpbmVyID0gb3B0aW9ucy5sZXZlbFZpZXdlcjsgLy8gdGhpcyBzaG91bGQgY2hhbmdlIHdoZW4gd2UgcmVwbGFjZSB0aGUgdGV4dCwgaWYgdGhlcmUgaXMgYSBsaW5rIGluc2lkZSBpdFxuXHRcdFx0Y29uc3QgZGVjb2RlSHRtbEVudGl0eSA9IGZ1bmN0aW9uIChzdHIpIHtcblx0XHRcdFx0cmV0dXJuIHN0ci5yZXBsYWNlKC8mIyhcXGQrKTsvZywgZnVuY3Rpb24gKG1hdGNoLCBkZWMpIHtcblx0XHRcdFx0XHRyZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShkZWMpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH07XG5cdFx0XHRpZiAodHlwZW9mIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdFx0bWVtYmVyX2xldmVsX3ByZWZpeCA9XG5cdFx0XHRcdFx0bWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLm1lbWJlcl9sZXZlbF9wcmVmaXg7XG5cdFx0XHR9XG5cblx0XHRcdGlmICgkKG9wdGlvbnMubGV2ZWxWaWV3ZXIpLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0JChvcHRpb25zLmxldmVsVmlld2VyKS5wcm9wKFxuXHRcdFx0XHRcdCdjbGFzcycsXG5cdFx0XHRcdFx0J2Etc2hvdy1sZXZlbCBhLXNob3ctbGV2ZWwtJyArIGxldmVsLm5hbWUudG9Mb3dlckNhc2UoKVxuXHRcdFx0XHQpO1xuXG5cdFx0XHRcdGlmIChcblx0XHRcdFx0XHQkKG9wdGlvbnMudXNlckN1cnJlbnRMZXZlbCkubGVuZ3RoID4gMCAmJlxuXHRcdFx0XHRcdG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLmxlbmd0aCA+XG5cdFx0XHRcdFx0XHQwXG5cdFx0XHRcdCkge1xuXHRcdFx0XHRcdGlmICgoJ2EnLCAkKG9wdGlvbnMubGV2ZWxWaWV3ZXIpLmxlbmd0aCA+IDApKSB7XG5cdFx0XHRcdFx0XHRsZXZlbFZpZXdlckNvbnRhaW5lciA9IG9wdGlvbnMubGV2ZWxWaWV3ZXIgKyAnIGEnO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdG9sZF9sZXZlbCA9XG5cdFx0XHRcdFx0XHRtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLm1lbWJlcl9sZXZlbC5yZXBsYWNlKFxuXHRcdFx0XHRcdFx0XHRtZW1iZXJfbGV2ZWxfcHJlZml4LFxuXHRcdFx0XHRcdFx0XHQnJ1xuXHRcdFx0XHRcdFx0KTtcblxuXHRcdFx0XHRcdGlmIChvbGRfbGV2ZWwgIT09IGxldmVsLm5hbWUudG9Mb3dlckNhc2UoKSkge1xuXHRcdFx0XHRcdFx0JChsZXZlbFZpZXdlckNvbnRhaW5lcikuaHRtbChcblx0XHRcdFx0XHRcdFx0ZGVjb2RlSHRtbEVudGl0eShcblx0XHRcdFx0XHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxWaWV3ZXIpLmRhdGEoJ2NoYW5nZWQnKVxuXHRcdFx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKGxldmVsVmlld2VyQ29udGFpbmVyKS5odG1sKFxuXHRcdFx0XHRcdFx0XHRkZWNvZGVIdG1sRW50aXR5KFxuXHRcdFx0XHRcdFx0XHRcdCQob3B0aW9ucy5sZXZlbFZpZXdlcikuZGF0YSgnbm90LWNoYW5nZWQnKVxuXHRcdFx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQob3B0aW9ucy5sZXZlbE5hbWUsIG9wdGlvbnMubGV2ZWxWaWV3ZXIpLnRleHQobGV2ZWwubmFtZSk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIHNob3dOZXdMZXZlbFxuXG5cdFx0c2V0RW5hYmxlZEdpZnRzKGxldmVsKSB7XG5cdFx0XHRjb25zdCBzZXRFbmFibGVkID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHQkKHRoaXMpLnByb3AoXG5cdFx0XHRcdFx0J2Rpc2FibGVkJyxcblx0XHRcdFx0XHRsZXZlbC55ZWFybHlBbW91bnQgPCAkKHRoaXMpLmRhdGEoJ21pblllYXJseUFtb3VudCcpXG5cdFx0XHRcdCk7XG5cdFx0XHR9O1xuXG5cdFx0XHQkKHRoaXMub3B0aW9ucy5naWZ0U2VsZWN0b3IpLmVhY2goc2V0RW5hYmxlZCk7XG5cblx0XHRcdGlmIChcblx0XHRcdFx0JCh0aGlzLm9wdGlvbnMuc3dhZ1NlbGVjdG9yKS5ub3QoJyNzd2FnLWRlY2xpbmUnKS5pcygnOmVuYWJsZWQnKVxuXHRcdFx0KSB7XG5cdFx0XHRcdCQoJy5zd2FnLWRpc2FibGVkJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdFx0XHQkKCcuc3dhZy1lbmFibGVkJykuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JCgnLnN3YWctZGlzYWJsZWQnKS5hZGRDbGFzcygnYWN0aXZlJyk7XG5cdFx0XHRcdCQoJy5zd2FnLWVuYWJsZWQnKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIHNldEVuYWJsZWRHaWZ0c1xuXHR9OyAvLyBlbmQgUGx1Z2luLnByb3RvdHlwZVxuXG5cdC8vIEEgcmVhbGx5IGxpZ2h0d2VpZ2h0IHBsdWdpbiB3cmFwcGVyIGFyb3VuZCB0aGUgY29uc3RydWN0b3IsXG5cdC8vIHByZXZlbnRpbmcgYWdhaW5zdCBtdWx0aXBsZSBpbnN0YW50aWF0aW9uc1xuXHQkLmZuW3BsdWdpbk5hbWVdID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICghJC5kYXRhKHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUpKSB7XG5cdFx0XHRcdCQuZGF0YSh0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKHRoaXMsIG9wdGlvbnMpKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcbn0pKGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCwgTWlublBvc3RNZW1iZXJzaGlwKTtcbiIsIihmdW5jdGlvbiAoJCkge1xuXHRmdW5jdGlvbiBiZW5lZml0Rm9ybSgpIHtcblx0XHRpZiAoXG5cdFx0XHQnYmFja19mb3J3YXJkJyA9PT1cblx0XHRcdHBlcmZvcm1hbmNlLmdldEVudHJpZXNCeVR5cGUoJ25hdmlnYXRpb24nKVswXS50eXBlXG5cdFx0KSB7XG5cdFx0XHRsb2NhdGlvbi5yZWxvYWQodHJ1ZSk7XG5cdFx0fVxuXHRcdCQoJy5hLWJlbmVmaXQtYnV0dG9uLmEtYnV0dG9uLWRpc2FibGVkJykucmVtb3ZlQXR0cignZGlzYWJsZWQnKTtcblx0XHQkKCcuYS1iZW5lZml0LWJ1dHRvbicpLmNsaWNrKGZ1bmN0aW9uIChldmVudCkge1xuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGNvbnN0ICRidXR0b24gPSAkKHRoaXMpO1xuXHRcdFx0Y29uc3QgJHN0YXR1cyA9ICQoJy5tLWJlbmVmaXQtbWVzc2FnZScsICQodGhpcykucGFyZW50KCkpO1xuXHRcdFx0Y29uc3QgJHNlbGVjdCA9ICQoJ3NlbGVjdCcsICQodGhpcykucGFyZW50KCkpO1xuXHRcdFx0Y29uc3Qgc2V0dGluZ3MgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX3NldHRpbmdzO1xuXHRcdFx0Ly8gcmVzZXQgdGhlIG1lc3NhZ2UgZm9yIGN1cnJlbnQgc3RhdHVzXG5cdFx0XHRpZiAoIScubS1iZW5lZml0LW1lc3NhZ2Utc3VjY2VzcycpIHtcblx0XHRcdFx0JCgnLm0tYmVuZWZpdC1tZXNzYWdlJykucmVtb3ZlQ2xhc3MoXG5cdFx0XHRcdFx0J20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgbS1iZW5lZml0LW1lc3NhZ2UtZXJyb3IgbS1iZW5lZml0LW1lc3NhZ2UtaW5mbydcblx0XHRcdFx0KTtcblx0XHRcdH1cblx0XHRcdC8vIHNldCBidXR0b24gdG8gcHJvY2Vzc2luZ1xuXHRcdFx0JGJ1dHRvbi50ZXh0KCdQcm9jZXNzaW5nJykuYWRkQ2xhc3MoJ2EtYnV0dG9uLWRpc2FibGVkJyk7XG5cblx0XHRcdC8vIGRpc2FibGUgYWxsIHRoZSBvdGhlciBidXR0b25zXG5cdFx0XHQkKCcuYS1iZW5lZml0LWJ1dHRvbicpLmFkZENsYXNzKCdhLWJ1dHRvbi1kaXNhYmxlZCcpO1xuXG5cdFx0XHQvLyBzZXQgYWpheCBkYXRhXG5cdFx0XHRsZXQgZGF0YSA9IHt9O1xuXHRcdFx0Y29uc3QgYmVuZWZpdFR5cGUgPSAkKCdpbnB1dFtuYW1lPVwiYmVuZWZpdC1uYW1lXCJdJykudmFsKCk7XG5cdFx0XHRpZiAoJ3BhcnRuZXItb2ZmZXJzJyA9PT0gYmVuZWZpdFR5cGUpIHtcblx0XHRcdFx0ZGF0YSA9IHtcblx0XHRcdFx0XHRhY3Rpb246ICdiZW5lZml0X2Zvcm1fc3VibWl0Jyxcblx0XHRcdFx0XHRtaW5ucG9zdF9tZW1iZXJzaGlwX2JlbmVmaXRfZm9ybV9ub25jZTpcblx0XHRcdFx0XHRcdCRidXR0b24uZGF0YSgnYmVuZWZpdC1ub25jZScpLFxuXHRcdFx0XHRcdGN1cnJlbnRfdXJsOiAkKCdpbnB1dFtuYW1lPVwiY3VycmVudF91cmxcIl0nKS52YWwoKSxcblx0XHRcdFx0XHQnYmVuZWZpdC1uYW1lJzogJCgnaW5wdXRbbmFtZT1cImJlbmVmaXQtbmFtZVwiXScpLnZhbCgpLFxuXHRcdFx0XHRcdGluc3RhbmNlX2lkOiAkKFxuXHRcdFx0XHRcdFx0J1tuYW1lPVwiaW5zdGFuY2UtaWQtJyArICRidXR0b24udmFsKCkgKyAnXCJdJ1xuXHRcdFx0XHRcdCkudmFsKCksXG5cdFx0XHRcdFx0cG9zdF9pZDogJGJ1dHRvbi52YWwoKSxcblx0XHRcdFx0XHRpc19hamF4OiAnMScsXG5cdFx0XHRcdH07XG5cblx0XHRcdFx0JC5wb3N0KHNldHRpbmdzLmFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uIChyZXNwb25zZSkge1xuXHRcdFx0XHRcdC8vIHN1Y2Nlc3Ncblx0XHRcdFx0XHRpZiAodHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2Vzcykge1xuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmRpcihyZXNwb25zZSk7XG5cdFx0XHRcdFx0XHQkYnV0dG9uXG5cdFx0XHRcdFx0XHRcdC52YWwocmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUpXG5cdFx0XHRcdFx0XHRcdC50ZXh0KHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsKVxuXHRcdFx0XHRcdFx0XHQucmVtb3ZlQ2xhc3MoJ2EtYnV0dG9uLWRpc2FibGVkJylcblx0XHRcdFx0XHRcdFx0LmFkZENsYXNzKHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzKVxuXHRcdFx0XHRcdFx0XHQucHJvcChyZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlKTtcblx0XHRcdFx0XHRcdCRzdGF0dXNcblx0XHRcdFx0XHRcdFx0Lmh0bWwocmVzcG9uc2UuZGF0YS5tZXNzYWdlKVxuXHRcdFx0XHRcdFx0XHQuYWRkQ2xhc3MoXG5cdFx0XHRcdFx0XHRcdFx0J20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgJyArXG5cdFx0XHRcdFx0XHRcdFx0XHRyZXNwb25zZS5kYXRhLm1lc3NhZ2VfY2xhc3Ncblx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdGlmICgwIDwgJHNlbGVjdC5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdFx0JHNlbGVjdC5wcm9wKCdkaXNhYmxlZCcsIHRydWUpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0JCgnLmEtYmVuZWZpdC1idXR0b24nKVxuXHRcdFx0XHRcdFx0XHQubm90KCRidXR0b24pXG5cdFx0XHRcdFx0XHRcdC52YWwocmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUpXG5cdFx0XHRcdFx0XHRcdC5hdHRyKCdkaXNhYmxlZCcsIHRydWUpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQvLyBlcnJvclxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmRpcihyZXNwb25zZSk7XG5cdFx0XHRcdFx0XHRpZiAoXG5cdFx0XHRcdFx0XHRcdCd1bmRlZmluZWQnID09PVxuXHRcdFx0XHRcdFx0XHR0eXBlb2YgcmVzcG9uc2UuZGF0YS5yZW1vdmVfaW5zdGFuY2VfdmFsdWVcblx0XHRcdFx0XHRcdCkge1xuXHRcdFx0XHRcdFx0XHRpZiAoJycgIT09IHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsKSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5zaG93KCk7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvblxuXHRcdFx0XHRcdFx0XHRcdFx0LnZhbChyZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSlcblx0XHRcdFx0XHRcdFx0XHRcdC50ZXh0KHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsKVxuXHRcdFx0XHRcdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCdhLWJ1dHRvbi1kaXNhYmxlZCcpXG5cdFx0XHRcdFx0XHRcdFx0XHQuYWRkQ2xhc3MocmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MpXG5cdFx0XHRcdFx0XHRcdFx0XHQucHJvcChyZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlKTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uLmhpZGUoKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0JCgnb3B0aW9uJywgJHNlbGVjdCkuZWFjaChmdW5jdGlvbiAoaSkge1xuXHRcdFx0XHRcdFx0XHRcdGlmIChcblx0XHRcdFx0XHRcdFx0XHRcdCQodGhpcykudmFsKCkgPT09XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXNwb25zZS5kYXRhLnJlbW92ZV9pbnN0YW5jZV92YWx1ZVxuXHRcdFx0XHRcdFx0XHRcdCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0JCh0aGlzKS5yZW1vdmUoKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHRpZiAoJycgIT09IHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsKSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5zaG93KCk7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvblxuXHRcdFx0XHRcdFx0XHRcdFx0LnZhbChyZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSlcblx0XHRcdFx0XHRcdFx0XHRcdC50ZXh0KHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsKVxuXHRcdFx0XHRcdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCdhLWJ1dHRvbi1kaXNhYmxlZCcpXG5cdFx0XHRcdFx0XHRcdFx0XHQuYWRkQ2xhc3MocmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MpXG5cdFx0XHRcdFx0XHRcdFx0XHQucHJvcChyZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlKTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uLmhpZGUoKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Ly8gcmUtZW5hYmxlIGFsbCB0aGUgb3RoZXIgYnV0dG9uc1xuXHRcdFx0XHRcdFx0JCgnLmEtYmVuZWZpdC1idXR0b24nKVxuXHRcdFx0XHRcdFx0XHQubm90KCRidXR0b24pXG5cdFx0XHRcdFx0XHRcdC5yZW1vdmVDbGFzcygnYS1idXR0b24tZGlzYWJsZWQnKTtcblx0XHRcdFx0XHRcdCRzdGF0dXNcblx0XHRcdFx0XHRcdFx0Lmh0bWwocmVzcG9uc2UuZGF0YS5tZXNzYWdlKVxuXHRcdFx0XHRcdFx0XHQuYWRkQ2xhc3MoXG5cdFx0XHRcdFx0XHRcdFx0J20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgJyArXG5cdFx0XHRcdFx0XHRcdFx0XHRyZXNwb25zZS5kYXRhLm1lc3NhZ2VfY2xhc3Ncblx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0JChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24gKCkge1xuXHRcdGlmICgwIDwgJCgnLm0tZm9ybS1tZW1iZXJzaGlwLWJlbmVmaXQnKS5sZW5ndGgpIHtcblx0XHRcdGJlbmVmaXRGb3JtKCk7XG5cdFx0fVxuXHRcdCQoJy5hLXJlZnJlc2gtcGFnZScpLm9uKCdjbGljaycsIGZ1bmN0aW9uIChldmVudCkge1xuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGxvY2F0aW9uLnJlbG9hZCgpO1xuXHRcdH0pO1xuXHR9KTtcbn0pKGpRdWVyeSk7XG4iLCJjb25zdCBidXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubS1zdXBwb3J0LWN0YS10b3AgLmEtc3VwcG9ydC1idXR0b24nKTtcbmlmIChidXR0b24pIHtcblx0YnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0bGV0IHZhbHVlID0gJyc7XG5cdFx0Y29uc3Qgc3ZnID0gYnV0dG9uLnF1ZXJ5U2VsZWN0b3IoJ3N2ZycpO1xuXHRcdGlmIChudWxsICE9PSBzdmcpIHtcblx0XHRcdGNvbnN0IGF0dHJpYnV0ZSA9IHN2Zy5nZXRBdHRyaWJ1dGUoJ3RpdGxlJyk7XG5cdFx0XHRpZiAobnVsbCAhPT0gYXR0cmlidXRlKSB7XG5cdFx0XHRcdHZhbHVlID0gYXR0cmlidXRlICsgJyAnO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR2YWx1ZSA9IHZhbHVlICsgYnV0dG9uLnRleHRDb250ZW50O1xuXHRcdHdwLmhvb2tzLmRvQWN0aW9uKFxuXHRcdFx0J21pbm5wb3N0TWVtYmVyc2hpcEFuYWx5dGljc0V2ZW50Jyxcblx0XHRcdCdldmVudCcsXG5cdFx0XHQnU3VwcG9ydCBDVEEgLSBIZWFkZXInLFxuXHRcdFx0J0NsaWNrOiAnICsgdmFsdWUsXG5cdFx0XHRsb2NhdGlvbi5wYXRobmFtZVxuXHRcdCk7XG5cdH0pO1xufVxuIiwiLy8gcGx1Z2luXG4oZnVuY3Rpb24gKCQsIHdpbmRvdywgZG9jdW1lbnQsIE1pbm5Qb3N0TWVtYmVyc2hpcCwgdW5kZWZpbmVkKSB7XG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHRjb25zdCBwbHVnaW5OYW1lID0gJ21pbm5wb3N0TWVtYmVyc2hpcCcsXG5cdFx0ZGVmYXVsdHMgPSB7XG5cdFx0XHRkZWJ1ZzogZmFsc2UsIC8vIHRoaXMgY2FuIGJlIHNldCB0byB0cnVlIG9uIHBhZ2UgbGV2ZWwgb3B0aW9uc1xuXHRcdFx0YW1vdW50X3ZpZXdlcjogJy5hbW91bnQgaDMnLFxuXHRcdFx0ZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVsczogJy5hLWZvcm0taXRlbS1tZW1iZXJzaGlwLWZyZXF1ZW5jeScsXG5cdFx0XHRmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzX3R5cGU6ICdzZWxlY3QnLFxuXHRcdFx0bGV2ZWxzX2NvbnRhaW5lcjogJy5vLW1lbWJlcnNoaXAtbWVtYmVyLWxldmVscycsXG5cdFx0XHRzaW5nbGVfbGV2ZWxfY29udGFpbmVyOiAnLm0tbWVtYmVyc2hpcC1tZW1iZXItbGV2ZWwnLFxuXHRcdFx0c2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3I6ICcubS1tZW1iZXItbGV2ZWwtYnJpZWYnLFxuXHRcdFx0ZmxpcHBlZF9pdGVtczogJ2Rpdi5hbW91bnQsIGRpdi5lbnRlcicsXG5cdFx0XHRsZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvcjogJy5zaG93LWZyZXF1ZW5jeScsXG5cdFx0XHRjaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVsczogJy5hbW91bnQgLmEtYnV0dG9uLWZsaXAnLFxuXHRcdFx0YW1vdW50X3NlbGVjdG9yX2luX2xldmVsczogJy5lbnRlciBpbnB1dC5hbW91bnQtZW50cnknLFxuXHRcdH07IC8vIGVuZCBkZWZhdWx0c1xuXG5cdC8vIFRoZSBhY3R1YWwgcGx1Z2luIGNvbnN0cnVjdG9yXG5cdGZ1bmN0aW9uIFBsdWdpbihlbGVtZW50LCBvcHRpb25zKSB7XG5cdFx0dGhpcy5lbGVtZW50ID0gZWxlbWVudDtcblxuXHRcdC8vIGpRdWVyeSBoYXMgYW4gZXh0ZW5kIG1ldGhvZCB3aGljaCBtZXJnZXMgdGhlIGNvbnRlbnRzIG9mIHR3byBvclxuXHRcdC8vIG1vcmUgb2JqZWN0cywgc3RvcmluZyB0aGUgcmVzdWx0IGluIHRoZSBmaXJzdCBvYmplY3QuIFRoZSBmaXJzdCBvYmplY3Rcblx0XHQvLyBpcyBnZW5lcmFsbHkgZW1wdHkgYXMgd2UgZG9uJ3Qgd2FudCB0byBhbHRlciB0aGUgZGVmYXVsdCBvcHRpb25zIGZvclxuXHRcdC8vIGZ1dHVyZSBpbnN0YW5jZXMgb2YgdGhlIHBsdWdpblxuXHRcdHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBkZWZhdWx0cywgb3B0aW9ucyk7XG5cblx0XHR0aGlzLl9kZWZhdWx0cyA9IGRlZmF1bHRzO1xuXHRcdHRoaXMuX25hbWUgPSBwbHVnaW5OYW1lO1xuXG5cdFx0dGhpcy5pbml0KCk7XG5cdH0gLy8gZW5kIGNvbnN0cnVjdG9yXG5cblx0UGx1Z2luLnByb3RvdHlwZSA9IHtcblx0XHRpbml0KHJlc2V0LCBhbW91bnQpIHtcblx0XHRcdC8vIFBsYWNlIGluaXRpYWxpemF0aW9uIGxvZ2ljIGhlcmVcblx0XHRcdC8vIFlvdSBhbHJlYWR5IGhhdmUgYWNjZXNzIHRvIHRoZSBET00gZWxlbWVudCBhbmRcblx0XHRcdC8vIHRoZSBvcHRpb25zIHZpYSB0aGUgaW5zdGFuY2UsIGUuZy4gdGhpcy5lbGVtZW50XG5cdFx0XHQvLyBhbmQgdGhpcy5vcHRpb25zXG5cdFx0XHQvLyB5b3UgY2FuIGFkZCBtb3JlIGZ1bmN0aW9ucyBsaWtlIHRoZSBvbmUgYmVsb3cgYW5kXG5cdFx0XHQvLyBjYWxsIHRoZW0gbGlrZSBzbzogdGhpcy55b3VyT3RoZXJGdW5jdGlvbih0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucykuXG5cdFx0XHR0aGlzLmNhdGNoSGFzaExpbmtzKHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zKTtcblx0XHRcdHRoaXMubGV2ZWxGbGlwcGVyKHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zKTtcblx0XHRcdHRoaXMuc3RhcnRMZXZlbENsaWNrKHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zKTtcblx0XHR9LFxuXG5cdFx0Y2F0Y2hIYXNoTGlua3MoZWxlbWVudCwgb3B0aW9ucykge1xuXHRcdFx0JCgnYVtocmVmKj1cIiNcIl06bm90KFtocmVmPVwiI1wiXSknLCBlbGVtZW50KS5jbGljayhmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHR2YXIgdGFyZ2V0ID0gJChlLnRhcmdldCk7XG5cdFx0XHRcdGlmIChcblx0XHRcdFx0XHR0YXJnZXQucGFyZW50KCcuY29tbWVudC10aXRsZScpLmxlbmd0aCA9PSAwICYmXG5cdFx0XHRcdFx0bG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sICcnKSA9PVxuXHRcdFx0XHRcdFx0dGhpcy5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywgJycpICYmXG5cdFx0XHRcdFx0bG9jYXRpb24uaG9zdG5hbWUgPT0gdGhpcy5ob3N0bmFtZVxuXHRcdFx0XHQpIHtcblx0XHRcdFx0XHR2YXIgdGFyZ2V0ID0gJCh0aGlzLmhhc2gpO1xuXHRcdFx0XHRcdHRhcmdldCA9IHRhcmdldC5sZW5ndGhcblx0XHRcdFx0XHRcdD8gdGFyZ2V0XG5cdFx0XHRcdFx0XHQ6ICQoJ1tuYW1lPScgKyB0aGlzLmhhc2guc2xpY2UoMSkgKyAnXScpO1xuXHRcdFx0XHRcdGlmICh0YXJnZXQubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHQkKCdodG1sLGJvZHknKS5hbmltYXRlKFxuXHRcdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdFx0c2Nyb2xsVG9wOiB0YXJnZXQub2Zmc2V0KCkudG9wLFxuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHQxMDAwXG5cdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSwgLy8gZW5kIGNhdGNoTGlua3NcblxuXHRcdGxldmVsRmxpcHBlcihlbGVtZW50LCBvcHRpb25zKSB7XG5cdFx0XHRjb25zdCB0aGF0ID0gdGhpcztcblx0XHRcdGxldCBhbW91bnQgPSAwO1xuXHRcdFx0bGV0IGxldmVsID0gJyc7XG5cdFx0XHRsZXQgbGV2ZWxfbnVtYmVyID0gMDtcblx0XHRcdGxldCBmcmVxdWVuY3lfc3RyaW5nID0gJyc7XG5cdFx0XHRsZXQgZnJlcXVlbmN5ID0gJyc7XG5cdFx0XHRsZXQgZnJlcXVlbmN5X25hbWUgPSAnJztcblxuXHRcdFx0aWYgKCQob3B0aW9ucy5sZXZlbHNfY29udGFpbmVyKS5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdCQob3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkuZWFjaChcblx0XHRcdFx0XHRmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHQkKG9wdGlvbnMuZmxpcHBlZF9pdGVtcywgJCh0aGlzKSkud3JhcEFsbChcblx0XHRcdFx0XHRcdFx0JzxkaXYgY2xhc3M9XCJmbGlwcGVyXCIvPidcblx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHQpO1xuXHRcdFx0XHQkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCkub24oXG5cdFx0XHRcdFx0J2NoYW5nZScsXG5cdFx0XHRcdFx0ZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKHRoaXMpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKHRoaXMpLnZhbCgpO1xuXHRcdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBsZXZlbF9udW1iZXIgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRcdFx0XHRcdCQoXG5cdFx0XHRcdFx0XHRcdFx0b3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3Rvcixcblx0XHRcdFx0XHRcdFx0XHRlbGVtZW50XG5cdFx0XHRcdFx0XHRcdCkucmVtb3ZlQ2xhc3MoJ2ZsaXBwZWQnKTtcblx0XHRcdFx0XHRcdFx0JChcblx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsXG5cdFx0XHRcdFx0XHRcdFx0ZWxlbWVudFxuXHRcdFx0XHRcdFx0XHQpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcblx0XHRcdFx0XHRcdFx0JChldmVudC50YXJnZXQpXG5cdFx0XHRcdFx0XHRcdFx0LmNsb3Nlc3Qob3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3Rvcilcblx0XHRcdFx0XHRcdFx0XHQuYWRkQ2xhc3MoJ2ZsaXBwZWQnKTtcblxuXHRcdFx0XHRcdFx0XHRpZiAoZnJlcXVlbmN5ID09IDEpIHtcblx0XHRcdFx0XHRcdFx0XHQkKFxuXHRcdFx0XHRcdFx0XHRcdFx0b3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLFxuXHRcdFx0XHRcdFx0XHRcdFx0JChcblx0XHRcdFx0XHRcdFx0XHRcdFx0b3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQnLScgK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGxldmVsX251bWJlclxuXHRcdFx0XHRcdFx0XHRcdFx0KVxuXHRcdFx0XHRcdFx0XHRcdCkudmFsKFxuXHRcdFx0XHRcdFx0XHRcdFx0JChcblx0XHRcdFx0XHRcdFx0XHRcdFx0b3B0aW9ucy5hbW91bnRfdmlld2VyLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHQkKFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQnLScgK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdClcblx0XHRcdFx0XHRcdFx0XHRcdCkuZGF0YSgnZGVmYXVsdC15ZWFybHknKVxuXHRcdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5ID09IDEyKSB7XG5cdFx0XHRcdFx0XHRcdFx0JChcblx0XHRcdFx0XHRcdFx0XHRcdG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyxcblx0XHRcdFx0XHRcdFx0XHRcdCQoXG5cdFx0XHRcdFx0XHRcdFx0XHRcdG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Jy0nICtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRsZXZlbF9udW1iZXJcblx0XHRcdFx0XHRcdFx0XHRcdClcblx0XHRcdFx0XHRcdFx0XHQpLnZhbChcblx0XHRcdFx0XHRcdFx0XHRcdCQoXG5cdFx0XHRcdFx0XHRcdFx0XHRcdG9wdGlvbnMuYW1vdW50X3ZpZXdlcixcblx0XHRcdFx0XHRcdFx0XHRcdFx0JChcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Jy0nICtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGxldmVsX251bWJlclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0XHRcdFx0XHQpLmRhdGEoJ2RlZmF1bHQtbW9udGhseScpXG5cdFx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdGFtb3VudCA9ICQoXG5cdFx0XHRcdFx0XHRcdFx0b3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICtcblx0XHRcdFx0XHRcdFx0XHRcdCdbZGF0YS1tZW1iZXItbGV2ZWwtbnVtYmVyPVwiJyArXG5cdFx0XHRcdFx0XHRcdFx0XHRsZXZlbF9udW1iZXIgK1xuXHRcdFx0XHRcdFx0XHRcdFx0J1wiXSdcblx0XHRcdFx0XHRcdFx0KS52YWwoKTtcblxuXHRcdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbChcblx0XHRcdFx0XHRcdFx0XHRhbW91bnQsXG5cdFx0XHRcdFx0XHRcdFx0ZnJlcXVlbmN5LFxuXHRcdFx0XHRcdFx0XHRcdGZyZXF1ZW5jeV9uYW1lLFxuXHRcdFx0XHRcdFx0XHRcdGVsZW1lbnQsXG5cdFx0XHRcdFx0XHRcdFx0b3B0aW9uc1xuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0XHR0aGF0LmNoYW5nZUZyZXF1ZW5jeShcblx0XHRcdFx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nLFxuXHRcdFx0XHRcdFx0XHRcdGxldmVsLm5hbWUsXG5cdFx0XHRcdFx0XHRcdFx0ZWxlbWVudCxcblx0XHRcdFx0XHRcdFx0XHRvcHRpb25zXG5cdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKFxuXHRcdFx0XHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IpLmxlbmd0aCA+IDBcblx0XHRcdFx0XHRcdCkge1xuXHRcdFx0XHRcdFx0XHQkKFxuXHRcdFx0XHRcdFx0XHRcdG9wdGlvbnMubGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IsXG5cdFx0XHRcdFx0XHRcdFx0ZWxlbWVudFxuXHRcdFx0XHRcdFx0XHQpLnRleHQoZnJlcXVlbmN5X25hbWUpO1xuXHRcdFx0XHRcdFx0XHQkKG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lcikuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJChcblx0XHRcdFx0XHRcdFx0XHRcdG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyxcblx0XHRcdFx0XHRcdFx0XHRcdCQodGhpcylcblx0XHRcdFx0XHRcdFx0XHQpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRcdFx0XHRpZiAodHlwZW9mIGxldmVsX251bWJlciAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdFx0XHRcdFx0XHRcdGFtb3VudCA9ICQoXG5cdFx0XHRcdFx0XHRcdFx0XHRcdG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyxcblx0XHRcdFx0XHRcdFx0XHRcdFx0JCh0aGlzKVxuXHRcdFx0XHRcdFx0XHRcdFx0KS52YWwoKTtcblx0XHRcdFx0XHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRhbW91bnQsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGZyZXF1ZW5jeSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGVsZW1lbnQsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdG9wdGlvbnNcblx0XHRcdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0dGhhdC5jaGFuZ2VBbW91bnRQcmV2aWV3KFxuXHRcdFx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nLFxuXHRcdFx0XHRcdFx0XHRsZXZlbC5uYW1lLFxuXHRcdFx0XHRcdFx0XHRlbGVtZW50LFxuXHRcdFx0XHRcdFx0XHRvcHRpb25zXG5cdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0KTtcblx0XHRcdH1cblx0XHRcdGlmICgkKG9wdGlvbnMuY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMpLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0JChvcHRpb25zLmNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50KS5jbGljayhcblx0XHRcdFx0XHRmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQoXG5cdFx0XHRcdFx0XHRcdG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyxcblx0XHRcdFx0XHRcdFx0ZWxlbWVudFxuXHRcdFx0XHRcdFx0KS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0XHQkKFxuXHRcdFx0XHRcdFx0XHRvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLFxuXHRcdFx0XHRcdFx0XHRlbGVtZW50XG5cdFx0XHRcdFx0XHQpLnJlbW92ZUNsYXNzKCdmbGlwcGVkJyk7XG5cdFx0XHRcdFx0XHQkKG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoXG5cdFx0XHRcdFx0XHRcdCdhY3RpdmUnXG5cdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0JChldmVudC50YXJnZXQpXG5cdFx0XHRcdFx0XHRcdC5jbG9zZXN0KG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IpXG5cdFx0XHRcdFx0XHRcdC5hZGRDbGFzcygnZmxpcHBlZCcpO1xuXHRcdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQoXG5cdFx0XHRcdFx0XHRcdG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyxcblx0XHRcdFx0XHRcdFx0JCh0aGlzKS5wYXJlbnQoKVxuXHRcdFx0XHRcdFx0KS52YWwoKTtcblx0XHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdFx0YW1vdW50ID0gJChcblx0XHRcdFx0XHRcdFx0b3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICtcblx0XHRcdFx0XHRcdFx0XHQnW2RhdGEtbWVtYmVyLWxldmVsLW51bWJlcj1cIicgK1xuXHRcdFx0XHRcdFx0XHRcdGxldmVsX251bWJlciArXG5cdFx0XHRcdFx0XHRcdFx0J1wiXSdcblx0XHRcdFx0XHRcdCkudmFsKCk7XG5cdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbChcblx0XHRcdFx0XHRcdFx0YW1vdW50LFxuXHRcdFx0XHRcdFx0XHRmcmVxdWVuY3ksXG5cdFx0XHRcdFx0XHRcdGZyZXF1ZW5jeV9uYW1lLFxuXHRcdFx0XHRcdFx0XHRlbGVtZW50LFxuXHRcdFx0XHRcdFx0XHRvcHRpb25zXG5cdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdCk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIGxldmVsRmxpcHBlclxuXG5cdFx0Y2hlY2tMZXZlbChhbW91bnQsIGZyZXF1ZW5jeSwgdHlwZSwgZWxlbWVudCwgb3B0aW9ucykge1xuXHRcdFx0Y29uc3QgbGV2ZWwgPSBNaW5uUG9zdE1lbWJlcnNoaXAuY2hlY2tMZXZlbChcblx0XHRcdFx0YW1vdW50LFxuXHRcdFx0XHRmcmVxdWVuY3ksXG5cdFx0XHRcdHR5cGVcblx0XHRcdCk7XG5cblx0XHRcdCQoJ2gyJywgb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcikuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGlmICgkKHRoaXMpLnRleHQoKSA9PSBsZXZlbC5uYW1lKSB7XG5cdFx0XHRcdFx0JChvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKFxuXHRcdFx0XHRcdFx0J2FjdGl2ZSdcblx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdCQodGhpcykucGFyZW50KCkucGFyZW50KCkuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIGxldmVsO1xuXHRcdH0sIC8vIGVuZCBjaGVja0xldmVsXG5cblx0XHRjaGFuZ2VGcmVxdWVuY3koc2VsZWN0ZWQsIGxldmVsLCBlbGVtZW50LCBvcHRpb25zKSB7XG5cdFx0XHQkKG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IpLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRsZXQgcmFuZ2UgPSAkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkudGV4dCgpO1xuXHRcdFx0XHRjb25zdCBtb250aF92YWx1ZSA9ICQob3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpKS5kYXRhKFxuXHRcdFx0XHRcdCdtb250aCdcblx0XHRcdFx0KTtcblx0XHRcdFx0Y29uc3QgeWVhcl92YWx1ZSA9ICQob3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpKS5kYXRhKFxuXHRcdFx0XHRcdCd5ZWFyJ1xuXHRcdFx0XHQpO1xuXHRcdFx0XHRjb25zdCBvbmNlX3ZhbHVlID0gJChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLmRhdGEoXG5cdFx0XHRcdFx0J29uZS10aW1lJ1xuXHRcdFx0XHQpO1xuXHRcdFx0XHRjb25zdCBmcmVxdWVuY3lfbmFtZSA9IHNlbGVjdGVkLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdFx0Y29uc3QgZnJlcXVlbmN5ID0gcGFyc2VJbnQoc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzFdKTtcblxuXHRcdFx0XHQkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscykudmFsKHNlbGVjdGVkKTtcblx0XHRcdFx0JChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMpLnByb3AoXG5cdFx0XHRcdFx0J3NlbGVjdGVkJyxcblx0XHRcdFx0XHRzZWxlY3RlZFxuXHRcdFx0XHQpO1xuXG5cdFx0XHRcdGlmIChmcmVxdWVuY3lfbmFtZSA9PSAncGVyIG1vbnRoJykge1xuXHRcdFx0XHRcdHJhbmdlID0gbW9udGhfdmFsdWU7XG5cdFx0XHRcdFx0JChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLnJlbW92ZUNsYXNzKCdzbWFsbGVyJyk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ3BlciB5ZWFyJykge1xuXHRcdFx0XHRcdHJhbmdlID0geWVhcl92YWx1ZTtcblx0XHRcdFx0XHQkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkuYWRkQ2xhc3MoJ3NtYWxsZXInKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3lfbmFtZSA9PSAnb25lLXRpbWUnKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBvbmNlX3ZhbHVlO1xuXHRcdFx0XHRcdCQob3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpKS5hZGRDbGFzcygnc21hbGxlcicpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLnRleHQocmFuZ2UpO1xuXHRcdFx0XHQkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSkuZGF0YShcblx0XHRcdFx0XHQnZnJlcXVlbmN5Jyxcblx0XHRcdFx0XHRmcmVxdWVuY3lcblx0XHRcdFx0KTtcblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBjaGFuZ2VGcmVxdWVuY3lcblxuXHRcdGNoYW5nZUFtb3VudFByZXZpZXcoc2VsZWN0ZWQsIGxldmVsLCBlbGVtZW50LCBvcHRpb25zKSB7XG5cdFx0XHQkKG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IpLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRsZXQgcmFuZ2UgPSAkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkudGV4dCgpO1xuXHRcdFx0XHRjb25zdCBtb250aF92YWx1ZSA9ICQob3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpKS5kYXRhKFxuXHRcdFx0XHRcdCdtb250aCdcblx0XHRcdFx0KTtcblx0XHRcdFx0Y29uc3QgeWVhcl92YWx1ZSA9ICQob3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpKS5kYXRhKFxuXHRcdFx0XHRcdCd5ZWFyJ1xuXHRcdFx0XHQpO1xuXHRcdFx0XHRjb25zdCBvbmNlX3ZhbHVlID0gJChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLmRhdGEoXG5cdFx0XHRcdFx0J29uZS10aW1lJ1xuXHRcdFx0XHQpO1xuXHRcdFx0XHRjb25zdCBmcmVxdWVuY3lfbmFtZSA9IHNlbGVjdGVkLnNwbGl0KCcgLSAnKVswXTtcblxuXHRcdFx0XHRpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ3BlciBtb250aCcpIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQob3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpKS5yZW1vdmVDbGFzcygnc21hbGxlcicpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgeWVhcicpIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLmFkZENsYXNzKCdzbWFsbGVyJyk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJykge1xuXHRcdFx0XHRcdHJhbmdlID0gb25jZV92YWx1ZTtcblx0XHRcdFx0XHQkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkuYWRkQ2xhc3MoJ3NtYWxsZXInKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQob3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpKS50ZXh0KHJhbmdlKTtcblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBjaGFuZ2VBbW91bnRQcmV2aWV3XG5cblx0XHRzdGFydExldmVsQ2xpY2soZWxlbWVudCwgb3B0aW9ucykge1xuXHRcdFx0JCgnLnN0YXJ0LWxldmVsJykuY2xpY2soZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRjb25zdCBsZXZlbF9jbGFzcyA9ICQodGhpcykucHJvcCgnY2xhc3MnKTtcblx0XHRcdFx0Y29uc3QgbGV2ZWxfbnVtYmVyID0gbGV2ZWxfY2xhc3NbbGV2ZWxfY2xhc3MubGVuZ3RoIC0gMV07XG5cdFx0XHRcdCQob3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoXG5cdFx0XHRcdFx0J2ZsaXBwZWQnXG5cdFx0XHRcdCk7XG5cdFx0XHRcdCQob3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyhcblx0XHRcdFx0XHQnYWN0aXZlJ1xuXHRcdFx0XHQpO1xuXHRcdFx0XHQkKFxuXHRcdFx0XHRcdG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlcixcblx0XHRcdFx0XHRlbGVtZW50XG5cdFx0XHRcdCkuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdFx0XHQkKFxuXHRcdFx0XHRcdG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArXG5cdFx0XHRcdFx0XHQnLScgK1xuXHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyICtcblx0XHRcdFx0XHRcdCcgJyArXG5cdFx0XHRcdFx0XHRvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yXG5cdFx0XHRcdCkuYWRkQ2xhc3MoJ2ZsaXBwZWQnKTtcblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBzdGFydExldmVsQ2xpY2tcblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoISQuZGF0YSh0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lKSkge1xuXHRcdFx0XHQkLmRhdGEodGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSwgbmV3IFBsdWdpbih0aGlzLCBvcHRpb25zKSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH07XG59KShqUXVlcnksIHdpbmRvdywgZG9jdW1lbnQsIE1pbm5Qb3N0TWVtYmVyc2hpcCk7XG4iXX0=
}(jQuery));
