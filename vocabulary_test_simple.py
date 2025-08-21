from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
from faker import Faker
import random

fake = Faker()

driver = webdriver.Chrome()
wait = WebDriverWait(driver, 10)

driver.get("https://vocabulary-test-m2.netlify.app/")

time.sleep(3)

for _ in range(5):
    name = fake.user_name()
    number = str(random.randint(100, 999))
    
    # Wait for elements to be interactable
    nickname_field = wait.until(EC.element_to_be_clickable((By.ID, "nickname")))
    number_field = wait.until(EC.element_to_be_clickable((By.ID, "number")))
    
    nickname_field.clear()
    nickname_field.send_keys(name)
    
    number_field.clear()
    number_field.send_keys(number)
    
    submit_button = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "#registration-form button[type='submit']")))
    
    # Multiple button presses
    for click in range(10):
        submit_button.click()
        time.sleep(0.1)
    
    time.sleep(2)
    
    # Check if moved to questionnaire
    try:
        questionnaire = wait.until(EC.presence_of_element_located((By.ID, "questionnaire-section")))
        if questionnaire.is_displayed():
            break
    except:
        pass

# Fill questionnaire and submit multiple times
try:
    time.sleep(3)
    
    answers = ["doctor", "teacher", "plumber", "engineer", "chef", "nurse", "artist", "scientist", "lawyer", "architect"]
    
    for i in range(10):
        question_field = wait.until(EC.element_to_be_clickable((By.ID, f"question{i+1}")))
        question_field.clear()
        question_field.send_keys(answers[i])
    
    # Multiple page reloads in the middle of test, after words
    for reload in range(5):
        driver.refresh()
        time.sleep(2)
    
    # After reloads, check if we're on questionnaire or back to registration
    try:
        # Try to find questionnaire fields
        question_field = wait.until(EC.element_to_be_clickable((By.ID, "question1")))
        
        # Fill questionnaire again after reloads
        for i in range(10):
            question_field = wait.until(EC.element_to_be_clickable((By.ID, f"question{i+1}")))
            question_field.clear()
            question_field.send_keys(answers[i])
    except:
        # If questionnaire not found, we're back to registration
        # Fill registration and go to questionnaire
        nickname_field = wait.until(EC.element_to_be_clickable((By.ID, "nickname")))
        number_field = wait.until(EC.element_to_be_clickable((By.ID, "number")))
        
        nickname_field.send_keys("ReloadUser")
        number_field.send_keys("123")
        
        submit_button = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "#registration-form button[type='submit']")))
        submit_button.click()
        
        time.sleep(3)
        
        # Now fill questionnaire
        for i in range(10):
            question_field = wait.until(EC.element_to_be_clickable((By.ID, f"question{i+1}")))
            question_field.clear()
            question_field.send_keys(answers[i])
    
    submit_button = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "#questionnaire-form button[type='submit']")))
    
    # Multiple button presses
    for click in range(15):
        submit_button.click()
        time.sleep(0.05)
    
    time.sleep(3)
    
except Exception as e:
    pass

# Multiple page reloads at the end
for reload in range(8):
    driver.refresh()
    time.sleep(2)

driver.quit()
