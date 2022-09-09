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
        let annual_recurring_amount = parseInt(this.previousAmount.annual_recurring_amount, 10); // calculate member level formula

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
    giftLabel: '.m-gift-level .m-form-item input[type="radio"] + label',
    swagEligibilityText: '.m-membership-gift-selector .swag-eligibility',
    swagSelector: '.m-select-swag input[type="radio"]',
    swagLabels: '.m-select-swag input[type="radio"] + label',
    minAmounts: '.m-membership-gift-selector .min-amount',
    declineGiftLevel: '.m-decline-level'
  }; // The actual plugin constructor

  function Plugin(element, options) {
    this.element = element; // jQuery has an extend method which merges the contents of two or
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
      } // Set up the UI for the current field state on (re-)load


      this.setAmountLabels($frequency.filter(':checked').val());
      this.setMinAmounts($frequency.filter(':checked').val());
      this.checkAndSetLevel(false);
      $frequency.on('change', this.onFrequencyChange.bind(this));
      $suggestedAmount.on('change', this.onSuggestedAmountChange.bind(this));
      $amount.on('keyup mouseup', this.onAmountChange.bind(this));

      if (!($declineBenefits.length > 0 && $gifts.length > 0)) {
        return;
      } // Set up the UI for the current field state on (re-)load


      if ($gifts.not(this.options.declineGiftLevel).is(':checked')) {
        $(this.element).find(this.options.declineGiftLevel).prop('checked', false);
      }

      this.onDeclineBenefitsChange();
      this.setRequiredFields($gifts);
      $declineBenefits.on('change', this.onDeclineBenefitsChange.bind(this));
      $gifts.on('click', this.onGiftsClick.bind(this)); // when the form is submitted

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

    /*
     * create an analytics product variable
     */
    analyticsProduct(level, amount, frequency_label) {
      const product = {
        id: 'minnpost_' + level.toLowerCase() + '_membership',
        name: 'MinnPost ' + level.charAt(0).toUpperCase() + level.slice(1) + ' Membership',
        category: 'Donation',
        brand: 'MinnPost',
        variant: frequency_label,
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
        const that = this;
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
      }; // this tracks an event submission based on the plugin options
      // it also bubbles the event up to submit the form

      wp.hooks.doAction('minnpostMembershipAnalyticsEvent', options.type, options.category, options.action, options.label);
      const hasClass = event.target.classList.contains('m-form-membership-support'); // if this is the main checkout form, send it to the ec plugin as a checkout

      if (hasClass) {
        const product = this.analyticsProduct(level.name, amount, frequency_label);
        wp.hooks.doAction('minnpostMembershipAnalyticsEcommerceAction', 'event', 'add_to_cart', product);
        wp.hooks.doAction('minnpostMembershipAnalyticsEcommerceAction', 'event', 'begin_checkout', product);
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
    if (2 === performance.navigation.type) {
      location.reload(true);
    }

    $('.a-benefit-button.a-button-disabled').removeAttr('disabled');
    $('.a-benefit-button').click(function (event) {
      event.preventDefault();
      const $button = $(this);
      const $status = $('.m-benefit-message', $(this).parent());
      const $select = $('select', $(this).parent());
      const settings = minnpost_membership_settings; // reset the message for current status

      if (!'.m-benefit-message-success') {
        $('.m-benefit-message').removeClass('m-benefit-message-visible m-benefit-message-error m-benefit-message-info');
      } // set button to processing


      $button.text('Processing').addClass('a-button-disabled'); // disable all the other buttons

      $('.a-benefit-button').addClass('a-button-disabled'); // set ajax data

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
            } // re-enable all the other buttons


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
    this.element = element; // jQuery has an extend method which merges the contents of two or
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1pbm5wb3N0LW1lbWJlcnNoaXAuanMiLCJhbW91bnQtc2VsZWN0LmpzIiwiYmVuZWZpdHMuanMiLCJjdGEuanMiLCJtZW1iZXItbGV2ZWxzLmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsIk1pbm5Qb3N0TWVtYmVyc2hpcCIsImRhdGEiLCJzZXR0aW5ncyIsInByZXZpb3VzQW1vdW50IiwiY3VycmVudF91c2VyIiwicHJldmlvdXNfYW1vdW50IiwicHJvdG90eXBlIiwiY2hlY2tMZXZlbCIsImFtb3VudCIsImZyZXF1ZW5jeSIsInR5cGUiLCJ0aGlzeWVhciIsInBhcnNlSW50IiwicHJpb3JfeWVhcl9hbW91bnQiLCJwcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMiLCJjb21pbmdfeWVhcl9hbW91bnQiLCJjb21pbmdfeWVhcl9jb250cmlidXRpb25zIiwiYW5udWFsX3JlY3VycmluZ19hbW91bnQiLCJNYXRoIiwibWF4IiwiZ2V0TGV2ZWwiLCJsZXZlbCIsInllYXJseUFtb3VudCIsIm5hbWUiLCJudW1iZXIiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX3NldHRpbmdzIiwiJCIsImRvY3VtZW50IiwicGx1Z2luTmFtZSIsImRlZmF1bHRzIiwiZnJlcXVlbmN5U2VsZWN0b3IiLCJhbW91bnRHcm91cCIsImFtb3VudFNlbGVjdG9yIiwiYW1vdW50TGFiZWxzIiwiYW1vdW50VmFsdWUiLCJhbW91bnREZXNjcmlwdGlvbiIsImFtb3VudEZpZWxkIiwiY3VzdG9tQW1vdW50RnJlcXVlbmN5IiwibGV2ZWxWaWV3ZXIiLCJsZXZlbE5hbWUiLCJ1c2VyQ3VycmVudExldmVsIiwiZGVjbGluZUJlbmVmaXRzIiwiZ2lmdFNlbGVjdGlvbkdyb3VwIiwiZ2lmdExldmVsIiwiZ2lmdFNlbGVjdG9yIiwiZ2lmdExhYmVsIiwic3dhZ0VsaWdpYmlsaXR5VGV4dCIsInN3YWdTZWxlY3RvciIsInN3YWdMYWJlbHMiLCJtaW5BbW91bnRzIiwiZGVjbGluZUdpZnRMZXZlbCIsIlBsdWdpbiIsImVsZW1lbnQiLCJvcHRpb25zIiwiZXh0ZW5kIiwiX2RlZmF1bHRzIiwiX25hbWUiLCJpbml0IiwiJGZyZXF1ZW5jeSIsImZpbmQiLCIkZm9ybSIsIiRzdWdnZXN0ZWRBbW91bnQiLCIkYW1vdW50IiwiJGRlY2xpbmVCZW5lZml0cyIsIiRnaWZ0cyIsImxlbmd0aCIsInNldEFtb3VudExhYmVscyIsImZpbHRlciIsInZhbCIsInNldE1pbkFtb3VudHMiLCJjaGVja0FuZFNldExldmVsIiwib24iLCJvbkZyZXF1ZW5jeUNoYW5nZSIsImJpbmQiLCJvblN1Z2dlc3RlZEFtb3VudENoYW5nZSIsIm9uQW1vdW50Q2hhbmdlIiwibm90IiwiaXMiLCJwcm9wIiwib25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UiLCJzZXRSZXF1aXJlZEZpZWxkcyIsIm9uR2lmdHNDbGljayIsInF1ZXJ5U2VsZWN0b3JBbGwiLCJmb3JFYWNoIiwibWVtYmVyc2hpcEZvcm0iLCJhZGRFdmVudExpc3RlbmVyIiwiZXZlbnQiLCJvbkZvcm1TdWJtaXQiLCJhbmFseXRpY3NQcm9kdWN0QWN0aW9uIiwiZnJlcXVlbmN5X2xhYmVsIiwiYWN0aW9uIiwic3RlcCIsInByb2R1Y3QiLCJhbmFseXRpY3NQcm9kdWN0Iiwid3AiLCJob29rcyIsImRvQWN0aW9uIiwiaWQiLCJ0b0xvd2VyQ2FzZSIsImNoYXJBdCIsInRvVXBwZXJDYXNlIiwic2xpY2UiLCJjYXRlZ29yeSIsImJyYW5kIiwidmFyaWFudCIsInByaWNlIiwicXVhbnRpdHkiLCJ0YXJnZXQiLCJjbGVhckFtb3VudFNlbGVjdG9yIiwiJHRhcmdldCIsIiRnaWZ0U2VsZWN0aW9uR3JvdXAiLCJkZWNsaW5lIiwiaGlkZSIsInNob3ciLCIkZGVjbGluZSIsIiRjaGVja2VkR2lmdHMiLCJ0aGF0IiwiZWFjaCIsInNldFJlcXVpcmVkIiwicGFyZW50IiwiZnJlcXVlbmN5X3N0cmluZyIsInNwbGl0IiwiZnJlcXVlbmN5X25hbWUiLCJmcmVxdWVuY3lfaWQiLCJ0ZXh0IiwibGFiZWwiLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwiaGFzQ2xhc3MiLCJjbGFzc0xpc3QiLCJjb250YWlucyIsImZyZXF1ZW5jeVN0cmluZyIsIiRncm91cHMiLCIkc2VsZWN0ZWQiLCJpbmRleCIsIiRjdXN0b21BbW91bnRGcmVxdWVuY3kiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiY3VycmVudEZyZXF1ZW5jeUxhYmVsIiwiZmlyc3QiLCIkZWxlbWVudHMiLCJ1cGRhdGVkIiwic2hvd05ld0xldmVsIiwic2V0RW5hYmxlZEdpZnRzIiwibWVtYmVyX2xldmVsX3ByZWZpeCIsIm9sZF9sZXZlbCIsImxldmVsVmlld2VyQ29udGFpbmVyIiwiZGVjb2RlSHRtbEVudGl0eSIsInN0ciIsInJlcGxhY2UiLCJtYXRjaCIsImRlYyIsIlN0cmluZyIsImZyb21DaGFyQ29kZSIsIm1lbWJlcl9sZXZlbCIsImh0bWwiLCJzZXRFbmFibGVkIiwiZm4iLCJqUXVlcnkiLCJiZW5lZml0Rm9ybSIsInBlcmZvcm1hbmNlIiwibmF2aWdhdGlvbiIsInJlbG9hZCIsInJlbW92ZUF0dHIiLCJjbGljayIsInByZXZlbnREZWZhdWx0IiwiJGJ1dHRvbiIsIiRzdGF0dXMiLCIkc2VsZWN0IiwiYmVuZWZpdFR5cGUiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX2JlbmVmaXRfZm9ybV9ub25jZSIsImN1cnJlbnRfdXJsIiwiaW5zdGFuY2VfaWQiLCJwb3N0X2lkIiwiaXNfYWpheCIsInBvc3QiLCJhamF4dXJsIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwiYnV0dG9uX3ZhbHVlIiwiYnV0dG9uX2xhYmVsIiwiYnV0dG9uX2NsYXNzIiwiYnV0dG9uX2F0dHIiLCJtZXNzYWdlIiwibWVzc2FnZV9jbGFzcyIsImF0dHIiLCJyZW1vdmVfaW5zdGFuY2VfdmFsdWUiLCJpIiwicmVtb3ZlIiwicmVhZHkiLCJidXR0b24iLCJxdWVyeVNlbGVjdG9yIiwidmFsdWUiLCJzdmciLCJhdHRyaWJ1dGUiLCJnZXRBdHRyaWJ1dGUiLCJ0ZXh0Q29udGVudCIsInVuZGVmaW5lZCIsImRlYnVnIiwiYW1vdW50X3ZpZXdlciIsImZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzX3R5cGUiLCJsZXZlbHNfY29udGFpbmVyIiwic2luZ2xlX2xldmVsX2NvbnRhaW5lciIsInNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yIiwiZmxpcHBlZF9pdGVtcyIsImxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yIiwiY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwicmVzZXQiLCJjYXRjaEhhc2hMaW5rcyIsImxldmVsRmxpcHBlciIsInN0YXJ0TGV2ZWxDbGljayIsImUiLCJob3N0bmFtZSIsImhhc2giLCJhbmltYXRlIiwic2Nyb2xsVG9wIiwib2Zmc2V0IiwidG9wIiwibGV2ZWxfbnVtYmVyIiwid3JhcEFsbCIsImNsb3Nlc3QiLCJjaGFuZ2VGcmVxdWVuY3kiLCJjaGFuZ2VBbW91bnRQcmV2aWV3Iiwic2VsZWN0ZWQiLCJyYW5nZSIsIm1vbnRoX3ZhbHVlIiwieWVhcl92YWx1ZSIsIm9uY2VfdmFsdWUiLCJsZXZlbF9jbGFzcyJdLCJtYXBwaW5ncyI6Ijs7QUFBQSxDQUFDLFVBQVVBLE1BQVYsRUFBa0I7RUFDbEIsU0FBU0Msa0JBQVQsQ0FBNEJDLElBQTVCLEVBQWtDQyxRQUFsQyxFQUE0QztJQUMzQyxLQUFLRCxJQUFMLEdBQVksRUFBWjs7SUFDQSxJQUFJLE9BQU9BLElBQVAsS0FBZ0IsV0FBcEIsRUFBaUM7TUFDaEMsS0FBS0EsSUFBTCxHQUFZQSxJQUFaO0lBQ0E7O0lBRUQsS0FBS0MsUUFBTCxHQUFnQixFQUFoQjs7SUFDQSxJQUFJLE9BQU9BLFFBQVAsS0FBb0IsV0FBeEIsRUFBcUM7TUFDcEMsS0FBS0EsUUFBTCxHQUFnQkEsUUFBaEI7SUFDQTs7SUFFRCxLQUFLQyxjQUFMLEdBQXNCLEVBQXRCOztJ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SixzQkFBUixHQUNDLEdBREQsR0FFQ2lCLFlBRkQsR0FHQyxHQUhELEdBSUN2SyxPQUFPLENBQUN1Siw2QkFMVCxDQUFELENBTUVuRSxRQU5GLENBTVcsU0FOWDtNQU9BLENBcEJEO0lBcUJBLENBbFVpQixDQWtVZjs7O0VBbFVlLENBQW5CLENBakM4RCxDQW9XM0Q7RUFFSDtFQUNBOztFQUNBL0csQ0FBQyxDQUFDbUksRUFBRixDQUFLakksVUFBTCxJQUFtQixVQUFVeUIsT0FBVixFQUFtQjtJQUNyQyxPQUFPLEtBQUtnRSxJQUFMLENBQVUsWUFBWTtNQUM1QixJQUFJLENBQUMzRixDQUFDLENBQUMxQixJQUFGLENBQU8sSUFBUCxFQUFhLFlBQVk0QixVQUF6QixDQUFMLEVBQTJDO1FBQzFDRixDQUFDLENBQUMxQixJQUFGLENBQU8sSUFBUCxFQUFhLFlBQVk0QixVQUF6QixFQUFxQyxJQUFJdUIsTUFBSixDQUFXLElBQVgsRUFBaUJFLE9BQWpCLENBQXJDO01BQ0E7SUFDRCxDQUpNLENBQVA7RUFLQSxDQU5EO0FBT0EsQ0EvV0QsRUErV0d5RyxNQS9XSCxFQStXV2hLLE1BL1dYLEVBK1dtQjZCLFFBL1duQixFQStXNkI1QixrQkEvVzdCIiwiZmlsZSI6Im1pbm5wb3N0LW1lbWJlcnNoaXAtZnJvbnQtZW5kLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uICh3aW5kb3cpIHtcblx0ZnVuY3Rpb24gTWlublBvc3RNZW1iZXJzaGlwKGRhdGEsIHNldHRpbmdzKSB7XG5cdFx0dGhpcy5kYXRhID0ge307XG5cdFx0aWYgKHR5cGVvZiBkYXRhICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0dGhpcy5kYXRhID0gZGF0YTtcblx0XHR9XG5cblx0XHR0aGlzLnNldHRpbmdzID0ge307XG5cdFx0aWYgKHR5cGVvZiBzZXR0aW5ncyAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcblx0XHR9XG5cblx0XHR0aGlzLnByZXZpb3VzQW1vdW50ID0gJyc7XG5cdFx0aWYgKFxuXHRcdFx0dHlwZW9mIHRoaXMuZGF0YS5jdXJyZW50X3VzZXIgIT09ICd1bmRlZmluZWQnICYmXG5cdFx0XHR0eXBlb2YgdGhpcy5kYXRhLmN1cnJlbnRfdXNlci5wcmV2aW91c19hbW91bnQgIT09ICd1bmRlZmluZWQnXG5cdFx0KSB7XG5cdFx0XHR0aGlzLnByZXZpb3VzQW1vdW50ID0gdGhpcy5kYXRhLmN1cnJlbnRfdXNlci5wcmV2aW91c19hbW91bnQ7XG5cdFx0fVxuXHR9XG5cblx0TWlublBvc3RNZW1iZXJzaGlwLnByb3RvdHlwZSA9IHtcblx0XHRjaGVja0xldmVsKGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlKSB7XG5cdFx0XHRsZXQgdGhpc3llYXIgPSBwYXJzZUludChhbW91bnQpICogcGFyc2VJbnQoZnJlcXVlbmN5KTtcblx0XHRcdGlmIChcblx0XHRcdFx0dHlwZW9mIHRoaXMucHJldmlvdXNBbW91bnQgIT09ICd1bmRlZmluZWQnICYmXG5cdFx0XHRcdHRoaXMucHJldmlvdXNBbW91bnQgIT09ICcnXG5cdFx0XHQpIHtcblx0XHRcdFx0bGV0IHByaW9yX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoXG5cdFx0XHRcdFx0dGhpcy5wcmV2aW91c0Ftb3VudC5wcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMsXG5cdFx0XHRcdFx0MTBcblx0XHRcdFx0KTtcblx0XHRcdFx0Y29uc3QgY29taW5nX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoXG5cdFx0XHRcdFx0dGhpcy5wcmV2aW91c0Ftb3VudC5jb21pbmdfeWVhcl9jb250cmlidXRpb25zLFxuXHRcdFx0XHRcdDEwXG5cdFx0XHRcdCk7XG5cdFx0XHRcdGxldCBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCA9IHBhcnNlSW50KFxuXHRcdFx0XHRcdHRoaXMucHJldmlvdXNBbW91bnQuYW5udWFsX3JlY3VycmluZ19hbW91bnQsXG5cdFx0XHRcdFx0MTBcblx0XHRcdFx0KTtcblx0XHRcdFx0Ly8gY2FsY3VsYXRlIG1lbWJlciBsZXZlbCBmb3JtdWxhXG5cdFx0XHRcdGlmICh0eXBlID09PSAnb25lLXRpbWUnKSB7XG5cdFx0XHRcdFx0cHJpb3JfeWVhcl9hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0YW5udWFsX3JlY3VycmluZ19hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR0aGlzeWVhciA9IE1hdGgubWF4KFxuXHRcdFx0XHRcdHByaW9yX3llYXJfYW1vdW50LFxuXHRcdFx0XHRcdGNvbWluZ195ZWFyX2Ftb3VudCxcblx0XHRcdFx0XHRhbm51YWxfcmVjdXJyaW5nX2Ftb3VudFxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gdGhpcy5nZXRMZXZlbCh0aGlzeWVhcik7XG5cdFx0fSwgLy8gZW5kIGNoZWNrTGV2ZWxcblxuXHRcdGdldExldmVsKHRoaXN5ZWFyKSB7XG5cdFx0XHRjb25zdCBsZXZlbCA9IHtcblx0XHRcdFx0eWVhcmx5QW1vdW50OiB0aGlzeWVhcixcblx0XHRcdH07XG5cdFx0XHRpZiAodGhpc3llYXIgPiAwICYmIHRoaXN5ZWFyIDwgNjApIHtcblx0XHRcdFx0bGV2ZWwubmFtZSA9ICdCcm9uemUnO1xuXHRcdFx0XHRsZXZlbC5udW1iZXIgPSAxO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDU5ICYmIHRoaXN5ZWFyIDwgMTIwKSB7XG5cdFx0XHRcdGxldmVsLm5hbWUgPSAnU2lsdmVyJztcblx0XHRcdFx0bGV2ZWwubnVtYmVyID0gMjtcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAxMTkgJiYgdGhpc3llYXIgPCAyNDApIHtcblx0XHRcdFx0bGV2ZWwubmFtZSA9ICdHb2xkJztcblx0XHRcdFx0bGV2ZWwubnVtYmVyID0gMztcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAyMzkpIHtcblx0XHRcdFx0bGV2ZWwubmFtZSA9ICdQbGF0aW51bSc7XG5cdFx0XHRcdGxldmVsLm51bWJlciA9IDQ7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbGV2ZWw7XG5cdFx0fSwgLy8gZW5kIGdldExldmVsXG5cdH07XG5cblx0d2luZG93Lk1pbm5Qb3N0TWVtYmVyc2hpcCA9IG5ldyBNaW5uUG9zdE1lbWJlcnNoaXAoXG5cdFx0d2luZG93Lm1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSxcblx0XHR3aW5kb3cubWlubnBvc3RfbWVtYmVyc2hpcF9zZXR0aW5nc1xuXHQpO1xufSkod2luZG93KTtcbiIsIi8vIHBsdWdpblxuKGZ1bmN0aW9uICgkLCB3aW5kb3csIGRvY3VtZW50LCBNaW5uUG9zdE1lbWJlcnNoaXApIHtcblx0Ly8gQ3JlYXRlIHRoZSBkZWZhdWx0cyBvbmNlXG5cdGNvbnN0IHBsdWdpbk5hbWUgPSAnbWlubnBvc3RBbW91bnRTZWxlY3QnLFxuXHRcdGRlZmF1bHRzID0ge1xuXHRcdFx0ZnJlcXVlbmN5U2VsZWN0b3I6ICcubS1mcmVxdWVuY3ktc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0XHRhbW91bnRHcm91cDogJy5tLWZyZXF1ZW5jeS1ncm91cCcsXG5cdFx0XHRhbW91bnRTZWxlY3RvcjogJy5tLWFtb3VudC1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRcdGFtb3VudExhYmVsczogJy5tLWFtb3VudC1zZWxlY3QgbGFiZWwnLFxuXHRcdFx0YW1vdW50VmFsdWU6ICdzdHJvbmcnLFxuXHRcdFx0YW1vdW50RGVzY3JpcHRpb246ICcuYS1hbW91bnQtZGVzY3JpcHRpb24nLFxuXHRcdFx0YW1vdW50RmllbGQ6ICcuYS1hbW91bnQtZmllbGQgI2Ftb3VudCcsXG5cdFx0XHRjdXN0b21BbW91bnRGcmVxdWVuY3k6ICcjYW1vdW50LWl0ZW0gLmEtZnJlcXVlbmN5LXRleHQtbGFiZWwnLFxuXHRcdFx0bGV2ZWxWaWV3ZXI6ICcuYS1zaG93LWxldmVsJyxcblx0XHRcdGxldmVsTmFtZTogJy5hLWxldmVsJyxcblx0XHRcdHVzZXJDdXJyZW50TGV2ZWw6ICcuYS1jdXJyZW50LWxldmVsJyxcblx0XHRcdGRlY2xpbmVCZW5lZml0czogJy5tLWRlY2xpbmUtYmVuZWZpdHMtc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0XHRnaWZ0U2VsZWN0aW9uR3JvdXA6ICcubS1tZW1iZXJzaGlwLWdpZnQtc2VsZWN0b3InLFxuXHRcdFx0Z2lmdExldmVsOiAnLm0tZ2lmdC1sZXZlbCcsXG5cdFx0XHRnaWZ0U2VsZWN0b3I6ICcubS1naWZ0LWxldmVsIC5tLWZvcm0taXRlbSBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdFx0Z2lmdExhYmVsOiAnLm0tZ2lmdC1sZXZlbCAubS1mb3JtLWl0ZW0gaW5wdXRbdHlwZT1cInJhZGlvXCJdICsgbGFiZWwnLFxuXHRcdFx0c3dhZ0VsaWdpYmlsaXR5VGV4dDpcblx0XHRcdFx0Jy5tLW1lbWJlcnNoaXAtZ2lmdC1zZWxlY3RvciAuc3dhZy1lbGlnaWJpbGl0eScsXG5cdFx0XHRzd2FnU2VsZWN0b3I6ICcubS1zZWxlY3Qtc3dhZyBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdFx0c3dhZ0xhYmVsczogJy5tLXNlbGVjdC1zd2FnIGlucHV0W3R5cGU9XCJyYWRpb1wiXSArIGxhYmVsJyxcblx0XHRcdG1pbkFtb3VudHM6ICcubS1tZW1iZXJzaGlwLWdpZnQtc2VsZWN0b3IgLm1pbi1hbW91bnQnLFxuXHRcdFx0ZGVjbGluZUdpZnRMZXZlbDogJy5tLWRlY2xpbmUtbGV2ZWwnLFxuXHRcdH07XG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKGVsZW1lbnQsIG9wdGlvbnMpIHtcblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIGRlZmF1bHRzLCBvcHRpb25zKTtcblxuXHRcdHRoaXMuX2RlZmF1bHRzID0gZGVmYXVsdHM7XG5cdFx0dGhpcy5fbmFtZSA9IHBsdWdpbk5hbWU7XG5cblx0XHR0aGlzLmluaXQoKTtcblx0fSAvLyBlbmQgY29uc3RydWN0b3JcblxuXHRQbHVnaW4ucHJvdG90eXBlID0ge1xuXHRcdGluaXQoKSB7XG5cdFx0XHRjb25zdCAkZnJlcXVlbmN5ID0gJCh0aGlzLmVsZW1lbnQpLmZpbmQoXG5cdFx0XHRcdHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvclxuXHRcdFx0KTtcblx0XHRcdGNvbnN0ICRmb3JtID0gJCh0aGlzLmVsZW1lbnQpO1xuXHRcdFx0Y29uc3QgJHN1Z2dlc3RlZEFtb3VudCA9ICQodGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yKTtcblx0XHRcdGNvbnN0ICRhbW91bnQgPSAkKHRoaXMuZWxlbWVudCkuZmluZCh0aGlzLm9wdGlvbnMuYW1vdW50RmllbGQpO1xuXHRcdFx0Y29uc3QgJGRlY2xpbmVCZW5lZml0cyA9ICQodGhpcy5lbGVtZW50KS5maW5kKFxuXHRcdFx0XHR0aGlzLm9wdGlvbnMuZGVjbGluZUJlbmVmaXRzXG5cdFx0XHQpO1xuXHRcdFx0Y29uc3QgJGdpZnRzID0gJCh0aGlzLmVsZW1lbnQpLmZpbmQodGhpcy5vcHRpb25zLmdpZnRTZWxlY3Rvcik7XG5cdFx0XHRpZiAoXG5cdFx0XHRcdCEoXG5cdFx0XHRcdFx0JGFtb3VudC5sZW5ndGggPiAwICYmXG5cdFx0XHRcdFx0JGZyZXF1ZW5jeS5sZW5ndGggPiAwICYmXG5cdFx0XHRcdFx0JHN1Z2dlc3RlZEFtb3VudC5sZW5ndGggPiAwXG5cdFx0XHRcdClcblx0XHRcdCkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIFNldCB1cCB0aGUgVUkgZm9yIHRoZSBjdXJyZW50IGZpZWxkIHN0YXRlIG9uIChyZS0pbG9hZFxuXHRcdFx0dGhpcy5zZXRBbW91bnRMYWJlbHMoJGZyZXF1ZW5jeS5maWx0ZXIoJzpjaGVja2VkJykudmFsKCkpO1xuXHRcdFx0dGhpcy5zZXRNaW5BbW91bnRzKCRmcmVxdWVuY3kuZmlsdGVyKCc6Y2hlY2tlZCcpLnZhbCgpKTtcblx0XHRcdHRoaXMuY2hlY2tBbmRTZXRMZXZlbChmYWxzZSk7XG5cblx0XHRcdCRmcmVxdWVuY3kub24oJ2NoYW5nZScsIHRoaXMub25GcmVxdWVuY3lDaGFuZ2UuYmluZCh0aGlzKSk7XG5cdFx0XHQkc3VnZ2VzdGVkQW1vdW50Lm9uKFxuXHRcdFx0XHQnY2hhbmdlJyxcblx0XHRcdFx0dGhpcy5vblN1Z2dlc3RlZEFtb3VudENoYW5nZS5iaW5kKHRoaXMpXG5cdFx0XHQpO1xuXHRcdFx0JGFtb3VudC5vbigna2V5dXAgbW91c2V1cCcsIHRoaXMub25BbW91bnRDaGFuZ2UuYmluZCh0aGlzKSk7XG5cblx0XHRcdGlmICghKCRkZWNsaW5lQmVuZWZpdHMubGVuZ3RoID4gMCAmJiAkZ2lmdHMubGVuZ3RoID4gMCkpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBTZXQgdXAgdGhlIFVJIGZvciB0aGUgY3VycmVudCBmaWVsZCBzdGF0ZSBvbiAocmUtKWxvYWRcblx0XHRcdGlmICgkZ2lmdHMubm90KHRoaXMub3B0aW9ucy5kZWNsaW5lR2lmdExldmVsKS5pcygnOmNoZWNrZWQnKSkge1xuXHRcdFx0XHQkKHRoaXMuZWxlbWVudClcblx0XHRcdFx0XHQuZmluZCh0aGlzLm9wdGlvbnMuZGVjbGluZUdpZnRMZXZlbClcblx0XHRcdFx0XHQucHJvcCgnY2hlY2tlZCcsIGZhbHNlKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5vbkRlY2xpbmVCZW5lZml0c0NoYW5nZSgpO1xuXHRcdFx0dGhpcy5zZXRSZXF1aXJlZEZpZWxkcygkZ2lmdHMpO1xuXG5cdFx0XHQkZGVjbGluZUJlbmVmaXRzLm9uKFxuXHRcdFx0XHQnY2hhbmdlJyxcblx0XHRcdFx0dGhpcy5vbkRlY2xpbmVCZW5lZml0c0NoYW5nZS5iaW5kKHRoaXMpXG5cdFx0XHQpO1xuXHRcdFx0JGdpZnRzLm9uKCdjbGljaycsIHRoaXMub25HaWZ0c0NsaWNrLmJpbmQodGhpcykpO1xuXG5cdFx0XHQvLyB3aGVuIHRoZSBmb3JtIGlzIHN1Ym1pdHRlZFxuXHRcdFx0ZG9jdW1lbnRcblx0XHRcdFx0LnF1ZXJ5U2VsZWN0b3JBbGwoJy5tLWZvcm0tbWVtYmVyc2hpcCcpXG5cdFx0XHRcdC5mb3JFYWNoKChtZW1iZXJzaGlwRm9ybSkgPT5cblx0XHRcdFx0XHRtZW1iZXJzaGlwRm9ybS5hZGRFdmVudExpc3RlbmVyKCdzdWJtaXQnLCAoZXZlbnQpID0+IHtcblx0XHRcdFx0XHRcdHRoaXMub25Gb3JtU3VibWl0KGV2ZW50KTtcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHQpO1xuXHRcdH0sIC8vIGVuZCBpbml0XG5cblx0XHQvKlxuXHRcdCAqIHJ1biBhbiBhbmFseXRpY3MgcHJvZHVjdCBhY3Rpb25cblx0XHQgKi9cblx0XHRhbmFseXRpY3NQcm9kdWN0QWN0aW9uKGxldmVsLCBhbW91bnQsIGZyZXF1ZW5jeV9sYWJlbCwgYWN0aW9uLCBzdGVwKSB7XG5cdFx0XHRjb25zdCBwcm9kdWN0ID0gdGhpcy5hbmFseXRpY3NQcm9kdWN0KFxuXHRcdFx0XHRsZXZlbCxcblx0XHRcdFx0YW1vdW50LFxuXHRcdFx0XHRmcmVxdWVuY3lfbGFiZWxcblx0XHRcdCk7XG5cdFx0XHR3cC5ob29rcy5kb0FjdGlvbihcblx0XHRcdFx0J21pbm5wb3N0TWVtYmVyc2hpcEFuYWx5dGljc0Vjb21tZXJjZUFjdGlvbicsXG5cdFx0XHRcdCdldmVudCcsXG5cdFx0XHRcdGFjdGlvbixcblx0XHRcdFx0cHJvZHVjdCxcblx0XHRcdFx0c3RlcFxuXHRcdFx0KTtcblx0XHR9LCAvLyBlbmQgYW5hbHl0aWNzUHJvZHVjdEFjdGlvblxuXG5cdFx0Lypcblx0XHQgKiBjcmVhdGUgYW4gYW5hbHl0aWNzIHByb2R1Y3QgdmFyaWFibGVcblx0XHQgKi9cblx0XHRhbmFseXRpY3NQcm9kdWN0KGxldmVsLCBhbW91bnQsIGZyZXF1ZW5jeV9sYWJlbCkge1xuXHRcdFx0Y29uc3QgcHJvZHVjdCA9IHtcblx0XHRcdFx0aWQ6ICdtaW5ucG9zdF8nICsgbGV2ZWwudG9Mb3dlckNhc2UoKSArICdfbWVtYmVyc2hpcCcsXG5cdFx0XHRcdG5hbWU6XG5cdFx0XHRcdFx0J01pbm5Qb3N0ICcgK1xuXHRcdFx0XHRcdGxldmVsLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICtcblx0XHRcdFx0XHRsZXZlbC5zbGljZSgxKSArXG5cdFx0XHRcdFx0JyBNZW1iZXJzaGlwJyxcblx0XHRcdFx0Y2F0ZWdvcnk6ICdEb25hdGlvbicsXG5cdFx0XHRcdGJyYW5kOiAnTWlublBvc3QnLFxuXHRcdFx0XHR2YXJpYW50OiBmcmVxdWVuY3lfbGFiZWwsXG5cdFx0XHRcdHByaWNlOiBhbW91bnQsXG5cdFx0XHRcdHF1YW50aXR5OiAxLFxuXHRcdFx0fTtcblx0XHRcdHJldHVybiBwcm9kdWN0O1xuXHRcdH0sIC8vIGVuZCBhbmFseXRpY3NQcm9kdWN0XG5cblx0XHRvbkZyZXF1ZW5jeUNoYW5nZShldmVudCkge1xuXHRcdFx0dGhpcy5zZXRBbW91bnRMYWJlbHMoJChldmVudC50YXJnZXQpLnZhbCgpKTtcblx0XHRcdHRoaXMuc2V0TWluQW1vdW50cygkKGV2ZW50LnRhcmdldCkudmFsKCkpO1xuXHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKHRydWUpO1xuXHRcdH0sIC8vIGVuZCBvbkZyZXF1ZW5jeUNoYW5nZVxuXG5cdFx0b25TdWdnZXN0ZWRBbW91bnRDaGFuZ2UoZXZlbnQpIHtcblx0XHRcdCQodGhpcy5lbGVtZW50KS5maW5kKHRoaXMub3B0aW9ucy5hbW91bnRGaWVsZCkudmFsKG51bGwpO1xuXHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKHRydWUpO1xuXHRcdH0sIC8vIGVuZCBvblN1Z2dlc3RlZEFtb3VudENoYW5nZVxuXG5cdFx0b25BbW91bnRDaGFuZ2UoZXZlbnQpIHtcblx0XHRcdHRoaXMuY2xlYXJBbW91bnRTZWxlY3RvcihldmVudCk7XG5cblx0XHRcdGNvbnN0ICR0YXJnZXQgPSAkKGV2ZW50LnRhcmdldCk7XG5cdFx0XHRpZiAoJHRhcmdldC5kYXRhKCdsYXN0LXZhbHVlJykgIT0gJHRhcmdldC52YWwoKSkge1xuXHRcdFx0XHQkdGFyZ2V0LmRhdGEoJ2xhc3QtdmFsdWUnLCAkdGFyZ2V0LnZhbCgpKTtcblx0XHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKHRydWUpO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBvbkFtb3VudENoYW5nZVxuXG5cdFx0b25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UoZXZlbnQpIHtcblx0XHRcdGNvbnN0ICRnaWZ0U2VsZWN0aW9uR3JvdXAgPSAkKHRoaXMuZWxlbWVudCkuZmluZChcblx0XHRcdFx0dGhpcy5vcHRpb25zLmdpZnRTZWxlY3Rpb25Hcm91cFxuXHRcdFx0KTtcblx0XHRcdGNvbnN0IGRlY2xpbmUgPSAkKHRoaXMuZWxlbWVudClcblx0XHRcdFx0LmZpbmQodGhpcy5vcHRpb25zLmRlY2xpbmVCZW5lZml0cylcblx0XHRcdFx0LmZpbHRlcignOmNoZWNrZWQnKVxuXHRcdFx0XHQudmFsKCk7XG5cblx0XHRcdGlmIChkZWNsaW5lID09PSAndHJ1ZScpIHtcblx0XHRcdFx0JGdpZnRTZWxlY3Rpb25Hcm91cC5oaWRlKCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0JGdpZnRTZWxlY3Rpb25Hcm91cC5zaG93KCk7XG5cdFx0fSwgLy8gZW5kIG9uRGVjbGluZUJlbmVmaXRzQ2hhbmdlXG5cblx0XHRvbkdpZnRzQ2xpY2soZXZlbnQpIHtcblx0XHRcdGNvbnN0ICRnaWZ0cyA9ICQodGhpcy5lbGVtZW50KVxuXHRcdFx0XHQuZmluZCh0aGlzLm9wdGlvbnMuZ2lmdFNlbGVjdG9yKVxuXHRcdFx0XHQubm90KHRoaXMub3B0aW9ucy5kZWNsaW5lR2lmdExldmVsKTtcblx0XHRcdGNvbnN0ICRkZWNsaW5lID0gJCh0aGlzLmVsZW1lbnQpLmZpbmQoXG5cdFx0XHRcdHRoaXMub3B0aW9ucy5kZWNsaW5lR2lmdExldmVsXG5cdFx0XHQpO1xuXHRcdFx0aWYgKCQoZXZlbnQudGFyZ2V0KS5pcyh0aGlzLm9wdGlvbnMuZGVjbGluZUdpZnRMZXZlbCkpIHtcblx0XHRcdFx0JGdpZnRzLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHRoaXMuc2V0UmVxdWlyZWRGaWVsZHMoJGdpZnRzKTtcblx0XHRcdCRkZWNsaW5lLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSk7XG5cdFx0fSwgLy8gZW5kIG9uR2lmdHNDbGlja1xuXG5cdFx0c2V0UmVxdWlyZWRGaWVsZHMoJGdpZnRzKSB7XG5cdFx0XHRjb25zdCAkY2hlY2tlZEdpZnRzID0gJGdpZnRzLmZpbHRlcignOmNoZWNrZWQnKTtcblx0XHRcdGlmICgkY2hlY2tlZEdpZnRzKSB7XG5cdFx0XHRcdGNvbnN0IHRoYXQgPSB0aGlzO1xuXHRcdFx0XHQkKFwiW2RhdGEtcmVxdWlyZWQ9J3RydWUnXVwiKS5wcm9wKCdyZXF1aXJlZCcsIGZhbHNlKTtcblx0XHRcdFx0JGNoZWNrZWRHaWZ0cy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRjb25zdCBzZXRSZXF1aXJlZCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdCQodGhpcykucHJvcCgncmVxdWlyZWQnLCB0cnVlKTtcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdCQoXCJbZGF0YS1yZXF1aXJlZD0ndHJ1ZSddXCIsICQodGhpcykucGFyZW50KCkpLmVhY2goXG5cdFx0XHRcdFx0XHRzZXRSZXF1aXJlZFxuXHRcdFx0XHRcdCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBzZXRSZXF1aXJlZEZpZWxkc1xuXG5cdFx0b25Gb3JtU3VibWl0KGV2ZW50KSB7XG5cdFx0XHRsZXQgYW1vdW50ID0gJCh0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IpXG5cdFx0XHRcdC5maWx0ZXIoJzpjaGVja2VkJylcblx0XHRcdFx0LnZhbCgpO1xuXHRcdFx0aWYgKHR5cGVvZiBhbW91bnQgPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRcdGFtb3VudCA9ICQodGhpcy5vcHRpb25zLmFtb3VudEZpZWxkKS52YWwoKTtcblx0XHRcdH1cblx0XHRcdGNvbnN0IGZyZXF1ZW5jeV9zdHJpbmcgPSAkKFxuXHRcdFx0XHR0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKyAnOmNoZWNrZWQnXG5cdFx0XHQpLnZhbCgpO1xuXHRcdFx0Y29uc3QgZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRjb25zdCBmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0Y29uc3QgZnJlcXVlbmN5X2lkID0gJChcblx0XHRcdFx0dGhpcy5vcHRpb25zLmZyZXF1ZW5jeVNlbGVjdG9yICsgJzpjaGVja2VkJ1xuXHRcdFx0KS5wcm9wKCdpZCcpO1xuXHRcdFx0Y29uc3QgZnJlcXVlbmN5X2xhYmVsID0gJChcblx0XHRcdFx0J2xhYmVsW2Zvcj1cIicgKyBmcmVxdWVuY3lfaWQgKyAnXCJdJ1xuXHRcdFx0KS50ZXh0KCk7XG5cdFx0XHRjb25zdCBsZXZlbCA9IE1pbm5Qb3N0TWVtYmVyc2hpcC5jaGVja0xldmVsKFxuXHRcdFx0XHRhbW91bnQsXG5cdFx0XHRcdGZyZXF1ZW5jeSxcblx0XHRcdFx0ZnJlcXVlbmN5X25hbWVcblx0XHRcdCk7XG5cblx0XHRcdGNvbnN0IG9wdGlvbnMgPSB7XG5cdFx0XHRcdHR5cGU6ICdldmVudCcsXG5cdFx0XHRcdGNhdGVnb3J5OiAnU3VwcG9ydCBVcycsXG5cdFx0XHRcdGFjdGlvbjogJ0JlY29tZSBBIE1lbWJlcicsXG5cdFx0XHRcdGxhYmVsOiBsb2NhdGlvbi5wYXRobmFtZSxcblx0XHRcdH07XG5cdFx0XHQvLyB0aGlzIHRyYWNrcyBhbiBldmVudCBzdWJtaXNzaW9uIGJhc2VkIG9uIHRoZSBwbHVnaW4gb3B0aW9uc1xuXHRcdFx0Ly8gaXQgYWxzbyBidWJibGVzIHRoZSBldmVudCB1cCB0byBzdWJtaXQgdGhlIGZvcm1cblx0XHRcdHdwLmhvb2tzLmRvQWN0aW9uKFxuXHRcdFx0XHQnbWlubnBvc3RNZW1iZXJzaGlwQW5hbHl0aWNzRXZlbnQnLFxuXHRcdFx0XHRvcHRpb25zLnR5cGUsXG5cdFx0XHRcdG9wdGlvbnMuY2F0ZWdvcnksXG5cdFx0XHRcdG9wdGlvbnMuYWN0aW9uLFxuXHRcdFx0XHRvcHRpb25zLmxhYmVsXG5cdFx0XHQpO1xuXHRcdFx0Y29uc3QgaGFzQ2xhc3MgPSBldmVudC50YXJnZXQuY2xhc3NMaXN0LmNvbnRhaW5zKFxuXHRcdFx0XHQnbS1mb3JtLW1lbWJlcnNoaXAtc3VwcG9ydCdcblx0XHRcdCk7XG5cdFx0XHQvLyBpZiB0aGlzIGlzIHRoZSBtYWluIGNoZWNrb3V0IGZvcm0sIHNlbmQgaXQgdG8gdGhlIGVjIHBsdWdpbiBhcyBhIGNoZWNrb3V0XG5cdFx0XHRpZiAoaGFzQ2xhc3MpIHtcblx0XHRcdFx0Y29uc3QgcHJvZHVjdCA9IHRoaXMuYW5hbHl0aWNzUHJvZHVjdChcblx0XHRcdFx0XHRsZXZlbC5uYW1lLFxuXHRcdFx0XHRcdGFtb3VudCxcblx0XHRcdFx0XHRmcmVxdWVuY3lfbGFiZWxcblx0XHRcdFx0KTtcblx0XHRcdFx0d3AuaG9va3MuZG9BY3Rpb24oXG5cdFx0XHRcdFx0J21pbm5wb3N0TWVtYmVyc2hpcEFuYWx5dGljc0Vjb21tZXJjZUFjdGlvbicsXG5cdFx0XHRcdFx0J2V2ZW50Jyxcblx0XHRcdFx0XHQnYWRkX3RvX2NhcnQnLFxuXHRcdFx0XHRcdHByb2R1Y3Rcblx0XHRcdFx0KTtcblx0XHRcdFx0d3AuaG9va3MuZG9BY3Rpb24oXG5cdFx0XHRcdFx0J21pbm5wb3N0TWVtYmVyc2hpcEFuYWx5dGljc0Vjb21tZXJjZUFjdGlvbicsXG5cdFx0XHRcdFx0J2V2ZW50Jyxcblx0XHRcdFx0XHQnYmVnaW5fY2hlY2tvdXQnLFxuXHRcdFx0XHRcdHByb2R1Y3Rcblx0XHRcdFx0KTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgb25Gb3JtU3VibWl0XG5cblx0XHRjbGVhckFtb3VudFNlbGVjdG9yKGV2ZW50KSB7XG5cdFx0XHRjb25zdCAkc3VnZ2VzdGVkQW1vdW50ID0gJCh0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IpO1xuXG5cdFx0XHRpZiAoJChldmVudC50YXJnZXQpLnZhbCgpID09PSAnJykge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdCRzdWdnZXN0ZWRBbW91bnQucHJvcCgnY2hlY2tlZCcsIGZhbHNlKTtcblx0XHR9LCAvLyBlbmQgY2xlYXJBbW91bnRTZWxlY3RvclxuXG5cdFx0c2V0QW1vdW50TGFiZWxzKGZyZXF1ZW5jeVN0cmluZykge1xuXHRcdFx0Y29uc3QgJGdyb3VwcyA9ICQodGhpcy5vcHRpb25zLmFtb3VudEdyb3VwKTtcblx0XHRcdGNvbnN0ICRzZWxlY3RlZCA9ICQodGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yKS5maWx0ZXIoJzpjaGVja2VkJyk7XG5cdFx0XHRjb25zdCBpbmRleCA9ICRzZWxlY3RlZC5kYXRhKCdpbmRleCcpO1xuXHRcdFx0Y29uc3QgJGN1c3RvbUFtb3VudEZyZXF1ZW5jeSA9ICQoXG5cdFx0XHRcdHRoaXMub3B0aW9ucy5jdXN0b21BbW91bnRGcmVxdWVuY3lcblx0XHRcdCk7XG5cblx0XHRcdCRncm91cHMucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdFx0JGdyb3Vwc1xuXHRcdFx0XHQuZmlsdGVyKCdbZGF0YS1mcmVxdWVuY3k9XCInICsgZnJlcXVlbmN5U3RyaW5nICsgJ1wiXScpXG5cdFx0XHRcdC5hZGRDbGFzcygnYWN0aXZlJyk7XG5cdFx0XHQkc2VsZWN0ZWQucHJvcCgnY2hlY2tlZCcsIGZhbHNlKTtcblx0XHRcdCRncm91cHNcblx0XHRcdFx0LmZpbHRlcignLmFjdGl2ZScpXG5cdFx0XHRcdC5maW5kKCdpbnB1dFt0eXBlPVwicmFkaW9cIl1bZGF0YS1pbmRleD1cIicgKyBpbmRleCArICdcIl0nKVxuXHRcdFx0XHQucHJvcCgnY2hlY2tlZCcsIHRydWUpO1xuXG5cdFx0XHRjb25zdCBjdXJyZW50RnJlcXVlbmN5TGFiZWwgPSAkZ3JvdXBzXG5cdFx0XHRcdC5maWx0ZXIoJy5hY3RpdmUnKVxuXHRcdFx0XHQuZmluZCgnLmEtZnJlcXVlbmN5LXRleHQtbGFiZWwnKVxuXHRcdFx0XHQuZmlyc3QoKVxuXHRcdFx0XHQudGV4dCgpO1xuXHRcdFx0JGN1c3RvbUFtb3VudEZyZXF1ZW5jeS50ZXh0KGN1cnJlbnRGcmVxdWVuY3lMYWJlbCk7XG5cdFx0fSwgLy8gZW5kIHNldEFtb3VudExhYmVsc1xuXG5cdFx0c2V0TWluQW1vdW50cyhmcmVxdWVuY3lTdHJpbmcpIHtcblx0XHRcdGNvbnN0ICRlbGVtZW50cyA9ICQodGhpcy5vcHRpb25zLm1pbkFtb3VudHMpO1xuXHRcdFx0JGVsZW1lbnRzLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcblx0XHRcdCRlbGVtZW50c1xuXHRcdFx0XHQuZmlsdGVyKCdbZGF0YS1mcmVxdWVuY3k9XCInICsgZnJlcXVlbmN5U3RyaW5nICsgJ1wiXScpXG5cdFx0XHRcdC5hZGRDbGFzcygnYWN0aXZlJyk7XG5cdFx0fSwgLy8gZW5kIHNldE1pbkFtb3VudHNcblxuXHRcdGNoZWNrQW5kU2V0TGV2ZWwodXBkYXRlZCkge1xuXHRcdFx0bGV0IGFtb3VudCA9ICQodGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yKVxuXHRcdFx0XHQuZmlsdGVyKCc6Y2hlY2tlZCcpXG5cdFx0XHRcdC52YWwoKTtcblx0XHRcdGlmICh0eXBlb2YgYW1vdW50ID09PSAndW5kZWZpbmVkJykge1xuXHRcdFx0XHRhbW91bnQgPSAkKHRoaXMub3B0aW9ucy5hbW91bnRGaWVsZCkudmFsKCk7XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IGZyZXF1ZW5jeV9zdHJpbmcgPSAkKFxuXHRcdFx0XHR0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKyAnOmNoZWNrZWQnXG5cdFx0XHQpLnZhbCgpO1xuXHRcdFx0Y29uc3QgZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRjb25zdCBmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0Y29uc3QgZnJlcXVlbmN5X2lkID0gJChcblx0XHRcdFx0dGhpcy5vcHRpb25zLmZyZXF1ZW5jeVNlbGVjdG9yICsgJzpjaGVja2VkJ1xuXHRcdFx0KS5wcm9wKCdpZCcpO1xuXHRcdFx0Y29uc3QgZnJlcXVlbmN5X2xhYmVsID0gJChcblx0XHRcdFx0J2xhYmVsW2Zvcj1cIicgKyBmcmVxdWVuY3lfaWQgKyAnXCJdJ1xuXHRcdFx0KS50ZXh0KCk7XG5cblx0XHRcdGNvbnN0IGxldmVsID0gTWlublBvc3RNZW1iZXJzaGlwLmNoZWNrTGV2ZWwoXG5cdFx0XHRcdGFtb3VudCxcblx0XHRcdFx0ZnJlcXVlbmN5LFxuXHRcdFx0XHRmcmVxdWVuY3lfbmFtZVxuXHRcdFx0KTtcblx0XHRcdHRoaXMuc2hvd05ld0xldmVsKHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zLCBsZXZlbCk7XG5cdFx0XHR0aGlzLnNldEVuYWJsZWRHaWZ0cyhsZXZlbCk7XG5cdFx0XHR0aGlzLmFuYWx5dGljc1Byb2R1Y3RBY3Rpb24oXG5cdFx0XHRcdGxldmVsLm5hbWUsXG5cdFx0XHRcdGFtb3VudCxcblx0XHRcdFx0ZnJlcXVlbmN5X2xhYmVsLFxuXHRcdFx0XHQnc2VsZWN0X2NvbnRlbnQnLFxuXHRcdFx0XHQxXG5cdFx0XHQpO1xuXHRcdH0sIC8vIGVuZCBjaGVja0FuZFNldExldmVsXG5cblx0XHRzaG93TmV3TGV2ZWwoZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwpIHtcblx0XHRcdGxldCBtZW1iZXJfbGV2ZWxfcHJlZml4ID0gJyc7XG5cdFx0XHRsZXQgb2xkX2xldmVsID0gJyc7XG5cdFx0XHRsZXQgbGV2ZWxWaWV3ZXJDb250YWluZXIgPSBvcHRpb25zLmxldmVsVmlld2VyOyAvLyB0aGlzIHNob3VsZCBjaGFuZ2Ugd2hlbiB3ZSByZXBsYWNlIHRoZSB0ZXh0LCBpZiB0aGVyZSBpcyBhIGxpbmsgaW5zaWRlIGl0XG5cdFx0XHRjb25zdCBkZWNvZGVIdG1sRW50aXR5ID0gZnVuY3Rpb24gKHN0cikge1xuXHRcdFx0XHRyZXR1cm4gc3RyLnJlcGxhY2UoLyYjKFxcZCspOy9nLCBmdW5jdGlvbiAobWF0Y2gsIGRlYykge1xuXHRcdFx0XHRcdHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKGRlYyk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fTtcblx0XHRcdGlmICh0eXBlb2YgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0XHRtZW1iZXJfbGV2ZWxfcHJlZml4ID1cblx0XHRcdFx0XHRtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEubWVtYmVyX2xldmVsX3ByZWZpeDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCQob3B0aW9ucy5sZXZlbFZpZXdlcikubGVuZ3RoID4gMCkge1xuXHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxWaWV3ZXIpLnByb3AoXG5cdFx0XHRcdFx0J2NsYXNzJyxcblx0XHRcdFx0XHQnYS1zaG93LWxldmVsIGEtc2hvdy1sZXZlbC0nICsgbGV2ZWwubmFtZS50b0xvd2VyQ2FzZSgpXG5cdFx0XHRcdCk7XG5cblx0XHRcdFx0aWYgKFxuXHRcdFx0XHRcdCQob3B0aW9ucy51c2VyQ3VycmVudExldmVsKS5sZW5ndGggPiAwICYmXG5cdFx0XHRcdFx0bWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5tZW1iZXJfbGV2ZWwubGVuZ3RoID5cblx0XHRcdFx0XHRcdDBcblx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0aWYgKCgnYScsICQob3B0aW9ucy5sZXZlbFZpZXdlcikubGVuZ3RoID4gMCkpIHtcblx0XHRcdFx0XHRcdGxldmVsVmlld2VyQ29udGFpbmVyID0gb3B0aW9ucy5sZXZlbFZpZXdlciArICcgYSc7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0b2xkX2xldmVsID1cblx0XHRcdFx0XHRcdG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLnJlcGxhY2UoXG5cdFx0XHRcdFx0XHRcdG1lbWJlcl9sZXZlbF9wcmVmaXgsXG5cdFx0XHRcdFx0XHRcdCcnXG5cdFx0XHRcdFx0XHQpO1xuXG5cdFx0XHRcdFx0aWYgKG9sZF9sZXZlbCAhPT0gbGV2ZWwubmFtZS50b0xvd2VyQ2FzZSgpKSB7XG5cdFx0XHRcdFx0XHQkKGxldmVsVmlld2VyQ29udGFpbmVyKS5odG1sKFxuXHRcdFx0XHRcdFx0XHRkZWNvZGVIdG1sRW50aXR5KFxuXHRcdFx0XHRcdFx0XHRcdCQob3B0aW9ucy5sZXZlbFZpZXdlcikuZGF0YSgnY2hhbmdlZCcpXG5cdFx0XHRcdFx0XHRcdClcblx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQobGV2ZWxWaWV3ZXJDb250YWluZXIpLmh0bWwoXG5cdFx0XHRcdFx0XHRcdGRlY29kZUh0bWxFbnRpdHkoXG5cdFx0XHRcdFx0XHRcdFx0JChvcHRpb25zLmxldmVsVmlld2VyKS5kYXRhKCdub3QtY2hhbmdlZCcpXG5cdFx0XHRcdFx0XHRcdClcblx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0JChvcHRpb25zLmxldmVsTmFtZSwgb3B0aW9ucy5sZXZlbFZpZXdlcikudGV4dChsZXZlbC5uYW1lKTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgc2hvd05ld0xldmVsXG5cblx0XHRzZXRFbmFibGVkR2lmdHMobGV2ZWwpIHtcblx0XHRcdGNvbnN0IHNldEVuYWJsZWQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdCQodGhpcykucHJvcChcblx0XHRcdFx0XHQnZGlzYWJsZWQnLFxuXHRcdFx0XHRcdGxldmVsLnllYXJseUFtb3VudCA8ICQodGhpcykuZGF0YSgnbWluWWVhcmx5QW1vdW50Jylcblx0XHRcdFx0KTtcblx0XHRcdH07XG5cblx0XHRcdCQodGhpcy5vcHRpb25zLmdpZnRTZWxlY3RvcikuZWFjaChzZXRFbmFibGVkKTtcblxuXHRcdFx0aWYgKFxuXHRcdFx0XHQkKHRoaXMub3B0aW9ucy5zd2FnU2VsZWN0b3IpLm5vdCgnI3N3YWctZGVjbGluZScpLmlzKCc6ZW5hYmxlZCcpXG5cdFx0XHQpIHtcblx0XHRcdFx0JCgnLnN3YWctZGlzYWJsZWQnKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG5cdFx0XHRcdCQoJy5zd2FnLWVuYWJsZWQnKS5hZGRDbGFzcygnYWN0aXZlJyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkKCcuc3dhZy1kaXNhYmxlZCcpLmFkZENsYXNzKCdhY3RpdmUnKTtcblx0XHRcdFx0JCgnLnN3YWctZW5hYmxlZCcpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgc2V0RW5hYmxlZEdpZnRzXG5cdH07IC8vIGVuZCBQbHVnaW4ucHJvdG90eXBlXG5cblx0Ly8gQSByZWFsbHkgbGlnaHR3ZWlnaHQgcGx1Z2luIHdyYXBwZXIgYXJvdW5kIHRoZSBjb25zdHJ1Y3Rvcixcblx0Ly8gcHJldmVudGluZyBhZ2FpbnN0IG11bHRpcGxlIGluc3RhbnRpYXRpb25zXG5cdCQuZm5bcGx1Z2luTmFtZV0gPSBmdW5jdGlvbiAob3B0aW9ucykge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCEkLmRhdGEodGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSkpIHtcblx0XHRcdFx0JC5kYXRhKHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUsIG5ldyBQbHVnaW4odGhpcywgb3B0aW9ucykpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xufSkoalF1ZXJ5LCB3aW5kb3csIGRvY3VtZW50LCBNaW5uUG9zdE1lbWJlcnNoaXApO1xuIiwiKGZ1bmN0aW9uICgkKSB7XG5cdGZ1bmN0aW9uIGJlbmVmaXRGb3JtKCkge1xuXHRcdGlmICgyID09PSBwZXJmb3JtYW5jZS5uYXZpZ2F0aW9uLnR5cGUpIHtcblx0XHRcdGxvY2F0aW9uLnJlbG9hZCh0cnVlKTtcblx0XHR9XG5cdFx0JCgnLmEtYmVuZWZpdC1idXR0b24uYS1idXR0b24tZGlzYWJsZWQnKS5yZW1vdmVBdHRyKCdkaXNhYmxlZCcpO1xuXHRcdCQoJy5hLWJlbmVmaXQtYnV0dG9uJykuY2xpY2soZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0Y29uc3QgJGJ1dHRvbiA9ICQodGhpcyk7XG5cdFx0XHRjb25zdCAkc3RhdHVzID0gJCgnLm0tYmVuZWZpdC1tZXNzYWdlJywgJCh0aGlzKS5wYXJlbnQoKSk7XG5cdFx0XHRjb25zdCAkc2VsZWN0ID0gJCgnc2VsZWN0JywgJCh0aGlzKS5wYXJlbnQoKSk7XG5cdFx0XHRjb25zdCBzZXR0aW5ncyA9IG1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3M7XG5cdFx0XHQvLyByZXNldCB0aGUgbWVzc2FnZSBmb3IgY3VycmVudCBzdGF0dXNcblx0XHRcdGlmICghJy5tLWJlbmVmaXQtbWVzc2FnZS1zdWNjZXNzJykge1xuXHRcdFx0XHQkKCcubS1iZW5lZml0LW1lc3NhZ2UnKS5yZW1vdmVDbGFzcyhcblx0XHRcdFx0XHQnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSBtLWJlbmVmaXQtbWVzc2FnZS1lcnJvciBtLWJlbmVmaXQtbWVzc2FnZS1pbmZvJ1xuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXHRcdFx0Ly8gc2V0IGJ1dHRvbiB0byBwcm9jZXNzaW5nXG5cdFx0XHQkYnV0dG9uLnRleHQoJ1Byb2Nlc3NpbmcnKS5hZGRDbGFzcygnYS1idXR0b24tZGlzYWJsZWQnKTtcblxuXHRcdFx0Ly8gZGlzYWJsZSBhbGwgdGhlIG90aGVyIGJ1dHRvbnNcblx0XHRcdCQoJy5hLWJlbmVmaXQtYnV0dG9uJykuYWRkQ2xhc3MoJ2EtYnV0dG9uLWRpc2FibGVkJyk7XG5cblx0XHRcdC8vIHNldCBhamF4IGRhdGFcblx0XHRcdGxldCBkYXRhID0ge307XG5cdFx0XHRjb25zdCBiZW5lZml0VHlwZSA9ICQoJ2lucHV0W25hbWU9XCJiZW5lZml0LW5hbWVcIl0nKS52YWwoKTtcblx0XHRcdGlmICgncGFydG5lci1vZmZlcnMnID09PSBiZW5lZml0VHlwZSkge1xuXHRcdFx0XHRkYXRhID0ge1xuXHRcdFx0XHRcdGFjdGlvbjogJ2JlbmVmaXRfZm9ybV9zdWJtaXQnLFxuXHRcdFx0XHRcdG1pbm5wb3N0X21lbWJlcnNoaXBfYmVuZWZpdF9mb3JtX25vbmNlOlxuXHRcdFx0XHRcdFx0JGJ1dHRvbi5kYXRhKCdiZW5lZml0LW5vbmNlJyksXG5cdFx0XHRcdFx0Y3VycmVudF91cmw6ICQoJ2lucHV0W25hbWU9XCJjdXJyZW50X3VybFwiXScpLnZhbCgpLFxuXHRcdFx0XHRcdCdiZW5lZml0LW5hbWUnOiAkKCdpbnB1dFtuYW1lPVwiYmVuZWZpdC1uYW1lXCJdJykudmFsKCksXG5cdFx0XHRcdFx0aW5zdGFuY2VfaWQ6ICQoXG5cdFx0XHRcdFx0XHQnW25hbWU9XCJpbnN0YW5jZS1pZC0nICsgJGJ1dHRvbi52YWwoKSArICdcIl0nXG5cdFx0XHRcdFx0KS52YWwoKSxcblx0XHRcdFx0XHRwb3N0X2lkOiAkYnV0dG9uLnZhbCgpLFxuXHRcdFx0XHRcdGlzX2FqYXg6ICcxJyxcblx0XHRcdFx0fTtcblxuXHRcdFx0XHQkLnBvc3Qoc2V0dGluZ3MuYWpheHVybCwgZGF0YSwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0Ly8gc3VjY2Vzc1xuXHRcdFx0XHRcdGlmICh0cnVlID09PSByZXNwb25zZS5zdWNjZXNzKSB7XG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUuZGlyKHJlc3BvbnNlKTtcblx0XHRcdFx0XHRcdCRidXR0b25cblx0XHRcdFx0XHRcdFx0LnZhbChyZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSlcblx0XHRcdFx0XHRcdFx0LnRleHQocmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwpXG5cdFx0XHRcdFx0XHRcdC5yZW1vdmVDbGFzcygnYS1idXR0b24tZGlzYWJsZWQnKVxuXHRcdFx0XHRcdFx0XHQuYWRkQ2xhc3MocmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MpXG5cdFx0XHRcdFx0XHRcdC5wcm9wKHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUpO1xuXHRcdFx0XHRcdFx0JHN0YXR1c1xuXHRcdFx0XHRcdFx0XHQuaHRtbChyZXNwb25zZS5kYXRhLm1lc3NhZ2UpXG5cdFx0XHRcdFx0XHRcdC5hZGRDbGFzcyhcblx0XHRcdFx0XHRcdFx0XHQnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSAnICtcblx0XHRcdFx0XHRcdFx0XHRcdHJlc3BvbnNlLmRhdGEubWVzc2FnZV9jbGFzc1xuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0aWYgKDAgPCAkc2VsZWN0Lmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0XHQkc2VsZWN0LnByb3AoJ2Rpc2FibGVkJywgdHJ1ZSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQkKCcuYS1iZW5lZml0LWJ1dHRvbicpXG5cdFx0XHRcdFx0XHRcdC5ub3QoJGJ1dHRvbilcblx0XHRcdFx0XHRcdFx0LnZhbChyZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSlcblx0XHRcdFx0XHRcdFx0LmF0dHIoJ2Rpc2FibGVkJywgdHJ1ZSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdC8vIGVycm9yXG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUuZGlyKHJlc3BvbnNlKTtcblx0XHRcdFx0XHRcdGlmIChcblx0XHRcdFx0XHRcdFx0J3VuZGVmaW5lZCcgPT09XG5cdFx0XHRcdFx0XHRcdHR5cGVvZiByZXNwb25zZS5kYXRhLnJlbW92ZV9pbnN0YW5jZV92YWx1ZVxuXHRcdFx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0XHRcdGlmICgnJyAhPT0gcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwpIHtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uLnNob3coKTtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uXG5cdFx0XHRcdFx0XHRcdFx0XHQudmFsKHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlKVxuXHRcdFx0XHRcdFx0XHRcdFx0LnRleHQocmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwpXG5cdFx0XHRcdFx0XHRcdFx0XHQucmVtb3ZlQ2xhc3MoJ2EtYnV0dG9uLWRpc2FibGVkJylcblx0XHRcdFx0XHRcdFx0XHRcdC5hZGRDbGFzcyhyZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcylcblx0XHRcdFx0XHRcdFx0XHRcdC5wcm9wKHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUpO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24uaGlkZSgpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHQkKCdvcHRpb24nLCAkc2VsZWN0KS5lYWNoKGZ1bmN0aW9uIChpKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKFxuXHRcdFx0XHRcdFx0XHRcdFx0JCh0aGlzKS52YWwoKSA9PT1cblx0XHRcdFx0XHRcdFx0XHRcdHJlc3BvbnNlLmRhdGEucmVtb3ZlX2luc3RhbmNlX3ZhbHVlXG5cdFx0XHRcdFx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0XHRcdFx0XHQkKHRoaXMpLnJlbW92ZSgpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdGlmICgnJyAhPT0gcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwpIHtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uLnNob3coKTtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uXG5cdFx0XHRcdFx0XHRcdFx0XHQudmFsKHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlKVxuXHRcdFx0XHRcdFx0XHRcdFx0LnRleHQocmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwpXG5cdFx0XHRcdFx0XHRcdFx0XHQucmVtb3ZlQ2xhc3MoJ2EtYnV0dG9uLWRpc2FibGVkJylcblx0XHRcdFx0XHRcdFx0XHRcdC5hZGRDbGFzcyhyZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcylcblx0XHRcdFx0XHRcdFx0XHRcdC5wcm9wKHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUpO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24uaGlkZSgpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQvLyByZS1lbmFibGUgYWxsIHRoZSBvdGhlciBidXR0b25zXG5cdFx0XHRcdFx0XHQkKCcuYS1iZW5lZml0LWJ1dHRvbicpXG5cdFx0XHRcdFx0XHRcdC5ub3QoJGJ1dHRvbilcblx0XHRcdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCdhLWJ1dHRvbi1kaXNhYmxlZCcpO1xuXHRcdFx0XHRcdFx0JHN0YXR1c1xuXHRcdFx0XHRcdFx0XHQuaHRtbChyZXNwb25zZS5kYXRhLm1lc3NhZ2UpXG5cdFx0XHRcdFx0XHRcdC5hZGRDbGFzcyhcblx0XHRcdFx0XHRcdFx0XHQnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSAnICtcblx0XHRcdFx0XHRcdFx0XHRcdHJlc3BvbnNlLmRhdGEubWVzc2FnZV9jbGFzc1xuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHQkKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKDAgPCAkKCcubS1mb3JtLW1lbWJlcnNoaXAtYmVuZWZpdCcpLmxlbmd0aCkge1xuXHRcdFx0YmVuZWZpdEZvcm0oKTtcblx0XHR9XG5cdFx0JCgnLmEtcmVmcmVzaC1wYWdlJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0bG9jYXRpb24ucmVsb2FkKCk7XG5cdFx0fSk7XG5cdH0pO1xufSkoalF1ZXJ5KTtcbiIsImNvbnN0IGJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5tLXN1cHBvcnQtY3RhLXRvcCAuYS1zdXBwb3J0LWJ1dHRvbicpO1xuaWYgKGJ1dHRvbikge1xuXHRidXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRsZXQgdmFsdWUgPSAnJztcblx0XHRjb25zdCBzdmcgPSBidXR0b24ucXVlcnlTZWxlY3Rvcignc3ZnJyk7XG5cdFx0aWYgKG51bGwgIT09IHN2Zykge1xuXHRcdFx0Y29uc3QgYXR0cmlidXRlID0gc3ZnLmdldEF0dHJpYnV0ZSgndGl0bGUnKTtcblx0XHRcdGlmIChudWxsICE9PSBhdHRyaWJ1dGUpIHtcblx0XHRcdFx0dmFsdWUgPSBhdHRyaWJ1dGUgKyAnICc7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHZhbHVlID0gdmFsdWUgKyBidXR0b24udGV4dENvbnRlbnQ7XG5cdFx0d3AuaG9va3MuZG9BY3Rpb24oXG5cdFx0XHQnbWlubnBvc3RNZW1iZXJzaGlwQW5hbHl0aWNzRXZlbnQnLFxuXHRcdFx0J2V2ZW50Jyxcblx0XHRcdCdTdXBwb3J0IENUQSAtIEhlYWRlcicsXG5cdFx0XHQnQ2xpY2s6ICcgKyB2YWx1ZSxcblx0XHRcdGxvY2F0aW9uLnBhdGhuYW1lXG5cdFx0KTtcblx0fSk7XG59XG4iLCIvLyBwbHVnaW5cbihmdW5jdGlvbiAoJCwgd2luZG93LCBkb2N1bWVudCwgTWlublBvc3RNZW1iZXJzaGlwLCB1bmRlZmluZWQpIHtcblx0Ly8gQ3JlYXRlIHRoZSBkZWZhdWx0cyBvbmNlXG5cdGNvbnN0IHBsdWdpbk5hbWUgPSAnbWlubnBvc3RNZW1iZXJzaGlwJyxcblx0XHRkZWZhdWx0cyA9IHtcblx0XHRcdGRlYnVnOiBmYWxzZSwgLy8gdGhpcyBjYW4gYmUgc2V0IHRvIHRydWUgb24gcGFnZSBsZXZlbCBvcHRpb25zXG5cdFx0XHRhbW91bnRfdmlld2VyOiAnLmFtb3VudCBoMycsXG5cdFx0XHRmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzOiAnLmEtZm9ybS1pdGVtLW1lbWJlcnNoaXAtZnJlcXVlbmN5Jyxcblx0XHRcdGZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHNfdHlwZTogJ3NlbGVjdCcsXG5cdFx0XHRsZXZlbHNfY29udGFpbmVyOiAnLm8tbWVtYmVyc2hpcC1tZW1iZXItbGV2ZWxzJyxcblx0XHRcdHNpbmdsZV9sZXZlbF9jb250YWluZXI6ICcubS1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbCcsXG5cdFx0XHRzaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcjogJy5tLW1lbWJlci1sZXZlbC1icmllZicsXG5cdFx0XHRmbGlwcGVkX2l0ZW1zOiAnZGl2LmFtb3VudCwgZGl2LmVudGVyJyxcblx0XHRcdGxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yOiAnLnNob3ctZnJlcXVlbmN5Jyxcblx0XHRcdGNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzOiAnLmFtb3VudCAuYS1idXR0b24tZmxpcCcsXG5cdFx0XHRhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzOiAnLmVudGVyIGlucHV0LmFtb3VudC1lbnRyeScsXG5cdFx0fTsgLy8gZW5kIGRlZmF1bHRzXG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKGVsZW1lbnQsIG9wdGlvbnMpIHtcblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIGRlZmF1bHRzLCBvcHRpb25zKTtcblxuXHRcdHRoaXMuX2RlZmF1bHRzID0gZGVmYXVsdHM7XG5cdFx0dGhpcy5fbmFtZSA9IHBsdWdpbk5hbWU7XG5cblx0XHR0aGlzLmluaXQoKTtcblx0fSAvLyBlbmQgY29uc3RydWN0b3JcblxuXHRQbHVnaW4ucHJvdG90eXBlID0ge1xuXHRcdGluaXQocmVzZXQsIGFtb3VudCkge1xuXHRcdFx0Ly8gUGxhY2UgaW5pdGlhbGl6YXRpb24gbG9naWMgaGVyZVxuXHRcdFx0Ly8gWW91IGFscmVhZHkgaGF2ZSBhY2Nlc3MgdG8gdGhlIERPTSBlbGVtZW50IGFuZFxuXHRcdFx0Ly8gdGhlIG9wdGlvbnMgdmlhIHRoZSBpbnN0YW5jZSwgZS5nLiB0aGlzLmVsZW1lbnRcblx0XHRcdC8vIGFuZCB0aGlzLm9wdGlvbnNcblx0XHRcdC8vIHlvdSBjYW4gYWRkIG1vcmUgZnVuY3Rpb25zIGxpa2UgdGhlIG9uZSBiZWxvdyBhbmRcblx0XHRcdC8vIGNhbGwgdGhlbSBsaWtlIHNvOiB0aGlzLnlvdXJPdGhlckZ1bmN0aW9uKHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zKS5cblx0XHRcdHRoaXMuY2F0Y2hIYXNoTGlua3ModGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpO1xuXHRcdFx0dGhpcy5sZXZlbEZsaXBwZXIodGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpO1xuXHRcdFx0dGhpcy5zdGFydExldmVsQ2xpY2sodGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpO1xuXHRcdH0sXG5cblx0XHRjYXRjaEhhc2hMaW5rcyhlbGVtZW50LCBvcHRpb25zKSB7XG5cdFx0XHQkKCdhW2hyZWYqPVwiI1wiXTpub3QoW2hyZWY9XCIjXCJdKScsIGVsZW1lbnQpLmNsaWNrKGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdHZhciB0YXJnZXQgPSAkKGUudGFyZ2V0KTtcblx0XHRcdFx0aWYgKFxuXHRcdFx0XHRcdHRhcmdldC5wYXJlbnQoJy5jb21tZW50LXRpdGxlJykubGVuZ3RoID09IDAgJiZcblx0XHRcdFx0XHRsb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywgJycpID09XG5cdFx0XHRcdFx0XHR0aGlzLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCAnJykgJiZcblx0XHRcdFx0XHRsb2NhdGlvbi5ob3N0bmFtZSA9PSB0aGlzLmhvc3RuYW1lXG5cdFx0XHRcdCkge1xuXHRcdFx0XHRcdHZhciB0YXJnZXQgPSAkKHRoaXMuaGFzaCk7XG5cdFx0XHRcdFx0dGFyZ2V0ID0gdGFyZ2V0Lmxlbmd0aFxuXHRcdFx0XHRcdFx0PyB0YXJnZXRcblx0XHRcdFx0XHRcdDogJCgnW25hbWU9JyArIHRoaXMuaGFzaC5zbGljZSgxKSArICddJyk7XG5cdFx0XHRcdFx0aWYgKHRhcmdldC5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdCQoJ2h0bWwsYm9keScpLmFuaW1hdGUoXG5cdFx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0XHRzY3JvbGxUb3A6IHRhcmdldC5vZmZzZXQoKS50b3AsXG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdDEwMDBcblx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgY2F0Y2hMaW5rc1xuXG5cdFx0bGV2ZWxGbGlwcGVyKGVsZW1lbnQsIG9wdGlvbnMpIHtcblx0XHRcdGNvbnN0IHRoYXQgPSB0aGlzO1xuXHRcdFx0bGV0IGFtb3VudCA9IDA7XG5cdFx0XHRsZXQgbGV2ZWwgPSAnJztcblx0XHRcdGxldCBsZXZlbF9udW1iZXIgPSAwO1xuXHRcdFx0bGV0IGZyZXF1ZW5jeV9zdHJpbmcgPSAnJztcblx0XHRcdGxldCBmcmVxdWVuY3kgPSAnJztcblx0XHRcdGxldCBmcmVxdWVuY3lfbmFtZSA9ICcnO1xuXG5cdFx0XHRpZiAoJChvcHRpb25zLmxldmVsc19jb250YWluZXIpLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0JChvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5lYWNoKFxuXHRcdFx0XHRcdGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdCQob3B0aW9ucy5mbGlwcGVkX2l0ZW1zLCAkKHRoaXMpKS53cmFwQWxsKFxuXHRcdFx0XHRcdFx0XHQnPGRpdiBjbGFzcz1cImZsaXBwZXJcIi8+J1xuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdCk7XG5cdFx0XHRcdCQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50KS5vbihcblx0XHRcdFx0XHQnY2hhbmdlJyxcblx0XHRcdFx0XHRmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQodGhpcykuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQodGhpcykudmFsKCk7XG5cdFx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRcdGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHRcdFx0XHRpZiAodHlwZW9mIGxldmVsX251bWJlciAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdFx0XHRcdFx0JChcblx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLFxuXHRcdFx0XHRcdFx0XHRcdGVsZW1lbnRcblx0XHRcdFx0XHRcdFx0KS5yZW1vdmVDbGFzcygnZmxpcHBlZCcpO1xuXHRcdFx0XHRcdFx0XHQkKFxuXHRcdFx0XHRcdFx0XHRcdG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lcixcblx0XHRcdFx0XHRcdFx0XHRlbGVtZW50XG5cdFx0XHRcdFx0XHRcdCkucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdFx0XHRcdFx0XHQkKGV2ZW50LnRhcmdldClcblx0XHRcdFx0XHRcdFx0XHQuY2xvc2VzdChvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yKVxuXHRcdFx0XHRcdFx0XHRcdC5hZGRDbGFzcygnZmxpcHBlZCcpO1xuXG5cdFx0XHRcdFx0XHRcdGlmIChmcmVxdWVuY3kgPT0gMSkge1xuXHRcdFx0XHRcdFx0XHRcdCQoXG5cdFx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsXG5cdFx0XHRcdFx0XHRcdFx0XHQkKFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCctJyArXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyXG5cdFx0XHRcdFx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0XHRcdFx0KS52YWwoXG5cdFx0XHRcdFx0XHRcdFx0XHQkKFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLmFtb3VudF92aWV3ZXIsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCQoXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0b3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCctJyArXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRsZXZlbF9udW1iZXJcblx0XHRcdFx0XHRcdFx0XHRcdFx0KVxuXHRcdFx0XHRcdFx0XHRcdFx0KS5kYXRhKCdkZWZhdWx0LXllYXJseScpXG5cdFx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3kgPT0gMTIpIHtcblx0XHRcdFx0XHRcdFx0XHQkKFxuXHRcdFx0XHRcdFx0XHRcdFx0b3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLFxuXHRcdFx0XHRcdFx0XHRcdFx0JChcblx0XHRcdFx0XHRcdFx0XHRcdFx0b3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQnLScgK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGxldmVsX251bWJlclxuXHRcdFx0XHRcdFx0XHRcdFx0KVxuXHRcdFx0XHRcdFx0XHRcdCkudmFsKFxuXHRcdFx0XHRcdFx0XHRcdFx0JChcblx0XHRcdFx0XHRcdFx0XHRcdFx0b3B0aW9ucy5hbW91bnRfdmlld2VyLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHQkKFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQnLScgK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdClcblx0XHRcdFx0XHRcdFx0XHRcdCkuZGF0YSgnZGVmYXVsdC1tb250aGx5Jylcblx0XHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0YW1vdW50ID0gJChcblx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgK1xuXHRcdFx0XHRcdFx0XHRcdFx0J1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICtcblx0XHRcdFx0XHRcdFx0XHRcdGxldmVsX251bWJlciArXG5cdFx0XHRcdFx0XHRcdFx0XHQnXCJdJ1xuXHRcdFx0XHRcdFx0XHQpLnZhbCgpO1xuXG5cdFx0XHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKFxuXHRcdFx0XHRcdFx0XHRcdGFtb3VudCxcblx0XHRcdFx0XHRcdFx0XHRmcmVxdWVuY3ksXG5cdFx0XHRcdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUsXG5cdFx0XHRcdFx0XHRcdFx0ZWxlbWVudCxcblx0XHRcdFx0XHRcdFx0XHRvcHRpb25zXG5cdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRcdHRoYXQuY2hhbmdlRnJlcXVlbmN5KFxuXHRcdFx0XHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcsXG5cdFx0XHRcdFx0XHRcdFx0bGV2ZWwubmFtZSxcblx0XHRcdFx0XHRcdFx0XHRlbGVtZW50LFxuXHRcdFx0XHRcdFx0XHRcdG9wdGlvbnNcblx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoXG5cdFx0XHRcdFx0XHRcdCQob3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvcikubGVuZ3RoID4gMFxuXHRcdFx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0XHRcdCQoXG5cdFx0XHRcdFx0XHRcdFx0b3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3Rvcixcblx0XHRcdFx0XHRcdFx0XHRlbGVtZW50XG5cdFx0XHRcdFx0XHRcdCkudGV4dChmcmVxdWVuY3lfbmFtZSk7XG5cdFx0XHRcdFx0XHRcdCQob3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyKS5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKFxuXHRcdFx0XHRcdFx0XHRcdFx0b3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLFxuXHRcdFx0XHRcdFx0XHRcdFx0JCh0aGlzKVxuXHRcdFx0XHRcdFx0XHRcdCkuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdFx0XHRcdGlmICh0eXBlb2YgbGV2ZWxfbnVtYmVyICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0XHRcdFx0XHRcdFx0YW1vdW50ID0gJChcblx0XHRcdFx0XHRcdFx0XHRcdFx0b3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHQkKHRoaXMpXG5cdFx0XHRcdFx0XHRcdFx0XHQpLnZhbCgpO1xuXHRcdFx0XHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGFtb3VudCxcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZnJlcXVlbmN5LFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZWxlbWVudCxcblx0XHRcdFx0XHRcdFx0XHRcdFx0b3B0aW9uc1xuXHRcdFx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHR0aGF0LmNoYW5nZUFtb3VudFByZXZpZXcoXG5cdFx0XHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcsXG5cdFx0XHRcdFx0XHRcdGxldmVsLm5hbWUsXG5cdFx0XHRcdFx0XHRcdGVsZW1lbnQsXG5cdFx0XHRcdFx0XHRcdG9wdGlvbnNcblx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCQob3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscykubGVuZ3RoID4gMCkge1xuXHRcdFx0XHQkKG9wdGlvbnMuY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQpLmNsaWNrKFxuXHRcdFx0XHRcdGZ1bmN0aW9uIChldmVudCkge1xuXHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJChcblx0XHRcdFx0XHRcdFx0b3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLFxuXHRcdFx0XHRcdFx0XHRlbGVtZW50XG5cdFx0XHRcdFx0XHQpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRcdCQoXG5cdFx0XHRcdFx0XHRcdG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsXG5cdFx0XHRcdFx0XHRcdGVsZW1lbnRcblx0XHRcdFx0XHRcdCkucmVtb3ZlQ2xhc3MoJ2ZsaXBwZWQnKTtcblx0XHRcdFx0XHRcdCQob3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyhcblx0XHRcdFx0XHRcdFx0J2FjdGl2ZSdcblx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHQkKGV2ZW50LnRhcmdldClcblx0XHRcdFx0XHRcdFx0LmNsb3Nlc3Qob3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3Rvcilcblx0XHRcdFx0XHRcdFx0LmFkZENsYXNzKCdmbGlwcGVkJyk7XG5cdFx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJChcblx0XHRcdFx0XHRcdFx0b3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLFxuXHRcdFx0XHRcdFx0XHQkKHRoaXMpLnBhcmVudCgpXG5cdFx0XHRcdFx0XHQpLnZhbCgpO1xuXHRcdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0XHRhbW91bnQgPSAkKFxuXHRcdFx0XHRcdFx0XHRvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgK1xuXHRcdFx0XHRcdFx0XHRcdCdbZGF0YS1tZW1iZXItbGV2ZWwtbnVtYmVyPVwiJyArXG5cdFx0XHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyICtcblx0XHRcdFx0XHRcdFx0XHQnXCJdJ1xuXHRcdFx0XHRcdFx0KS52YWwoKTtcblx0XHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKFxuXHRcdFx0XHRcdFx0XHRhbW91bnQsXG5cdFx0XHRcdFx0XHRcdGZyZXF1ZW5jeSxcblx0XHRcdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUsXG5cdFx0XHRcdFx0XHRcdGVsZW1lbnQsXG5cdFx0XHRcdFx0XHRcdG9wdGlvbnNcblx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0KTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgbGV2ZWxGbGlwcGVyXG5cblx0XHRjaGVja0xldmVsKGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlLCBlbGVtZW50LCBvcHRpb25zKSB7XG5cdFx0XHRjb25zdCBsZXZlbCA9IE1pbm5Qb3N0TWVtYmVyc2hpcC5jaGVja0xldmVsKFxuXHRcdFx0XHRhbW91bnQsXG5cdFx0XHRcdGZyZXF1ZW5jeSxcblx0XHRcdFx0dHlwZVxuXHRcdFx0KTtcblxuXHRcdFx0JCgnaDInLCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0aWYgKCQodGhpcykudGV4dCgpID09IGxldmVsLm5hbWUpIHtcblx0XHRcdFx0XHQkKG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoXG5cdFx0XHRcdFx0XHQnYWN0aXZlJ1xuXHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0JCh0aGlzKS5wYXJlbnQoKS5wYXJlbnQoKS5hZGRDbGFzcygnYWN0aXZlJyk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHRyZXR1cm4gbGV2ZWw7XG5cdFx0fSwgLy8gZW5kIGNoZWNrTGV2ZWxcblxuXHRcdGNoYW5nZUZyZXF1ZW5jeShzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMpIHtcblx0XHRcdCQob3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcikuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGxldCByYW5nZSA9ICQob3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpKS50ZXh0KCk7XG5cdFx0XHRcdGNvbnN0IG1vbnRoX3ZhbHVlID0gJChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLmRhdGEoXG5cdFx0XHRcdFx0J21vbnRoJ1xuXHRcdFx0XHQpO1xuXHRcdFx0XHRjb25zdCB5ZWFyX3ZhbHVlID0gJChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLmRhdGEoXG5cdFx0XHRcdFx0J3llYXInXG5cdFx0XHRcdCk7XG5cdFx0XHRcdGNvbnN0IG9uY2VfdmFsdWUgPSAkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkuZGF0YShcblx0XHRcdFx0XHQnb25lLXRpbWUnXG5cdFx0XHRcdCk7XG5cdFx0XHRcdGNvbnN0IGZyZXF1ZW5jeV9uYW1lID0gc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0XHRjb25zdCBmcmVxdWVuY3kgPSBwYXJzZUludChzZWxlY3RlZC5zcGxpdCgnIC0gJylbMV0pO1xuXG5cdFx0XHRcdCQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzKS52YWwoc2VsZWN0ZWQpO1xuXHRcdFx0XHQkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscykucHJvcChcblx0XHRcdFx0XHQnc2VsZWN0ZWQnLFxuXHRcdFx0XHRcdHNlbGVjdGVkXG5cdFx0XHRcdCk7XG5cblx0XHRcdFx0aWYgKGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBtb250aF92YWx1ZTtcblx0XHRcdFx0XHQkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkucmVtb3ZlQ2xhc3MoJ3NtYWxsZXInKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSB5ZWFyX3ZhbHVlO1xuXHRcdFx0XHRcdCQob3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpKS5hZGRDbGFzcygnc21hbGxlcicpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScpIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLmFkZENsYXNzKCdzbWFsbGVyJyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkudGV4dChyYW5nZSk7XG5cdFx0XHRcdCQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpKS5kYXRhKFxuXHRcdFx0XHRcdCdmcmVxdWVuY3knLFxuXHRcdFx0XHRcdGZyZXF1ZW5jeVxuXHRcdFx0XHQpO1xuXHRcdFx0fSk7XG5cdFx0fSwgLy8gZW5kIGNoYW5nZUZyZXF1ZW5jeVxuXG5cdFx0Y2hhbmdlQW1vdW50UHJldmlldyhzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMpIHtcblx0XHRcdCQob3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcikuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGxldCByYW5nZSA9ICQob3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpKS50ZXh0KCk7XG5cdFx0XHRcdGNvbnN0IG1vbnRoX3ZhbHVlID0gJChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLmRhdGEoXG5cdFx0XHRcdFx0J21vbnRoJ1xuXHRcdFx0XHQpO1xuXHRcdFx0XHRjb25zdCB5ZWFyX3ZhbHVlID0gJChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLmRhdGEoXG5cdFx0XHRcdFx0J3llYXInXG5cdFx0XHRcdCk7XG5cdFx0XHRcdGNvbnN0IG9uY2VfdmFsdWUgPSAkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkuZGF0YShcblx0XHRcdFx0XHQnb25lLXRpbWUnXG5cdFx0XHRcdCk7XG5cdFx0XHRcdGNvbnN0IGZyZXF1ZW5jeV9uYW1lID0gc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHRcdGlmIChmcmVxdWVuY3lfbmFtZSA9PSAncGVyIG1vbnRoJykge1xuXHRcdFx0XHRcdHJhbmdlID0gbW9udGhfdmFsdWU7XG5cdFx0XHRcdFx0JChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLnJlbW92ZUNsYXNzKCdzbWFsbGVyJyk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ3BlciB5ZWFyJykge1xuXHRcdFx0XHRcdHJhbmdlID0geWVhcl92YWx1ZTtcblx0XHRcdFx0XHQkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkuYWRkQ2xhc3MoJ3NtYWxsZXInKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3lfbmFtZSA9PSAnb25lLXRpbWUnKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBvbmNlX3ZhbHVlO1xuXHRcdFx0XHRcdCQob3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpKS5hZGRDbGFzcygnc21hbGxlcicpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLnRleHQocmFuZ2UpO1xuXHRcdFx0fSk7XG5cdFx0fSwgLy8gZW5kIGNoYW5nZUFtb3VudFByZXZpZXdcblxuXHRcdHN0YXJ0TGV2ZWxDbGljayhlbGVtZW50LCBvcHRpb25zKSB7XG5cdFx0XHQkKCcuc3RhcnQtbGV2ZWwnKS5jbGljayhmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGNvbnN0IGxldmVsX2NsYXNzID0gJCh0aGlzKS5wcm9wKCdjbGFzcycpO1xuXHRcdFx0XHRjb25zdCBsZXZlbF9udW1iZXIgPSBsZXZlbF9jbGFzc1tsZXZlbF9jbGFzcy5sZW5ndGggLSAxXTtcblx0XHRcdFx0JChvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyhcblx0XHRcdFx0XHQnZmxpcHBlZCdcblx0XHRcdFx0KTtcblx0XHRcdFx0JChvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKFxuXHRcdFx0XHRcdCdhY3RpdmUnXG5cdFx0XHRcdCk7XG5cdFx0XHRcdCQoXG5cdFx0XHRcdFx0b3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyLFxuXHRcdFx0XHRcdGVsZW1lbnRcblx0XHRcdFx0KS5hZGRDbGFzcygnYWN0aXZlJyk7XG5cdFx0XHRcdCQoXG5cdFx0XHRcdFx0b3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICtcblx0XHRcdFx0XHRcdCctJyArXG5cdFx0XHRcdFx0XHRsZXZlbF9udW1iZXIgK1xuXHRcdFx0XHRcdFx0JyAnICtcblx0XHRcdFx0XHRcdG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3Jcblx0XHRcdFx0KS5hZGRDbGFzcygnZmxpcHBlZCcpO1xuXHRcdFx0fSk7XG5cdFx0fSwgLy8gZW5kIHN0YXJ0TGV2ZWxDbGlja1xuXHR9OyAvLyBlbmQgUGx1Z2luLnByb3RvdHlwZVxuXG5cdC8vIEEgcmVhbGx5IGxpZ2h0d2VpZ2h0IHBsdWdpbiB3cmFwcGVyIGFyb3VuZCB0aGUgY29uc3RydWN0b3IsXG5cdC8vIHByZXZlbnRpbmcgYWdhaW5zdCBtdWx0aXBsZSBpbnN0YW50aWF0aW9uc1xuXHQkLmZuW3BsdWdpbk5hbWVdID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICghJC5kYXRhKHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUpKSB7XG5cdFx0XHRcdCQuZGF0YSh0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKHRoaXMsIG9wdGlvbnMpKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcbn0pKGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCwgTWlublBvc3RNZW1iZXJzaGlwKTtcbiJdfQ==
}(jQuery));
