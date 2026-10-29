import joblib

print("Loading AI Model...")

model = joblib.load("my_ai_model.pkl")

print("AI Model Loaded Successfully!")

hours = float(input("Enter study hours: "))

prediction = model.predict([[hours]])

print("Predicted Score:", round(prediction[0], 2))
